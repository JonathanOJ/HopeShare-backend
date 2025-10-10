const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const validationUploadService = require("../services/validationUploadService");

const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDbClient = DynamoDBDocumentClient.from(ddbClient);

const VALIDATION_USER_TABLE = process.env.VALIDATION_USER_TABLE;

const getValidationUser = async (user_id) => {
  const params = {
    TableName: VALIDATION_USER_TABLE,
    Key: { user_id },
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const createValidationUser = async (validationData) => {
  const { user_id, cnpj, company_name, observation, documents } =
    validationData;

  try {
    const uploadedDocuments =
      await validationUploadService.replaceUserValidationDocuments(
        user_id,
        documents
      );

    const params = {
      TableName: VALIDATION_USER_TABLE,
      Item: {
        validation_id: Date.now().toString(),
        user_id,
        status: "PENDING",
        cnpj,
        company_name,
        observation,
        observation_read: false,
        documents: uploadedDocuments,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ConditionExpression: "attribute_not_exists(user_id)",
    };

    await dynamoDbClient.send(new PutCommand(params));

    return {
      ...params.Item,
      success: true,
    };
  } catch (error) {
    // Se falhou no DynamoDB mas fez upload, tenta limpar
    if (error.message !== "Falha no upload") {
      try {
        await validationUploadService.deleteAllUserValidationDocuments(user_id);
      } catch (cleanupError) {
        console.error("Erro ao limpar documentos após falha:", cleanupError);
      }
    }

    throw new Error(
      `Não foi possível criar validação do usuário: ${error.message}`
    );
  }
};

const updateValidationUser = async (user_id, updateData) => {
  const { company_name, documents } = updateData;

  try {
    let uploadedDocuments = [];
    if (documents && documents.length > 0) {
      uploadedDocuments =
        await validationUploadService.replaceUserValidationDocuments(
          user_id,
          documents
        );
    }

    const params = {
      TableName: VALIDATION_USER_TABLE,
      Key: { user_id },
      UpdateExpression:
        "SET #status = :status, company_name = :company_name, observation = :observation, documents = :documents, updated_at = :updated_at",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "PENDING",
        ":company_name": company_name,
        ":observation": "",
        ":documents":
          uploadedDocuments.length > 0 ? uploadedDocuments : documents || [],
        ":updated_at": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDbClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    console.error("Erro ao atualizar validação:", error);
    throw new Error(
      `Não foi possível atualizar validação do usuário: ${error.message}`
    );
  }
};

const updateValidationAdmin = async (validation_id, updateData) => {
  const { status, observation } = updateData;

  const params = {
    TableName: VALIDATION_USER_TABLE,
    Key: { validation_id },
    UpdateExpression:
      "SET status = :status, observation = :observation, observation_read = :observation_read, updated_at = :updated_at",
    ExpressionAttributeValues: {
      ":status": status,
      ":observation": observation,
      ":observation_read": false,
      ":updated_at": new Date().toISOString(),
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamoDbClient.send(new UpdateCommand(params));
    return result.Attributes;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  getValidationUser,
  createValidationUser,
  updateValidationUser,
  updateValidationAdmin,
};
