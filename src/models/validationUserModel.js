const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const uploadService = require("../services/uploadService");

const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDbClient = DynamoDBDocumentClient.from(ddbClient);

const VALIDATION_USER_TABLE = process.env.VALIDATION_USER_TABLE;

const getValidationUser = async (user_id) => {
  if (!user_id || user_id.trim() === "") {
    console.error("Usuário é obrigatório");
    return null;
  }

  const params = {
    TableName: VALIDATION_USER_TABLE,
    FilterExpression: "#user.user_id = :user_id",
    ExpressionAttributeNames: {
      "#user": "user",
    },
    ExpressionAttributeValues: {
      ":user_id": user_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items?.[0] || null;
  } catch (error) {
    console.error("Erro ao buscar validação do usuário:", error);
    return null;
  }
};

const createValidationUser = async (validationData) => {
  const { user, cnpj, company_name, observation, documents } = validationData;

  try {
    const uploadedDocuments =
      await uploadService.replaceUserValidationDocuments(
        user.user_id,
        documents
      );

    const params = {
      TableName: VALIDATION_USER_TABLE,
      Item: {
        validation_id: Date.now().toString(),
        user,
        status: "PENDING",
        cnpj,
        company_name,
        observation,
        observation_read: false,
        documents: uploadedDocuments,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ConditionExpression: "attribute_not_exists(validation_id)",
    };

    await dynamoDbClient.send(new PutCommand(params));

    return {
      ...params.Item,
      success: true,
    };
  } catch (error) {
    if (error.message !== "Falha no upload") {
      try {
        await uploadService.deleteAllUserValidationDocuments(user.user_id);
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
    const existingValidation = await getValidationUser(user_id);
    if (!existingValidation) {
      throw new Error("Validação não encontrada para este usuário");
    }

    let uploadedDocuments = [];
    if (documents && documents.length > 0) {
      uploadedDocuments = await uploadService.replaceUserValidationDocuments(
        user_id,
        documents
      );
    }

    const params = {
      TableName: VALIDATION_USER_TABLE,
      Key: { validation_id: existingValidation.validation_id },
      UpdateExpression:
        "SET #status = :status, observation_read = :observation_read, company_name = :company_name, observation = :observation, documents = :documents, updated_at = :updated_at",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "PENDING",
        ":observation_read": true,
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
      "SET #status = :status, observation = :observation, observation_read = :observation_read, updated_at = :updated_at",
    ExpressionAttributeNames: {
      "#status": "status",
    },
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

const getPendingValidations = async () => {
  const params = {
    TableName: VALIDATION_USER_TABLE,
    FilterExpression: "#status = :status",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":status": "PENDING",
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    // O objeto user já está incluso em cada validação
    return result.Items || [];
  } catch (error) {
    console.error("Erro ao buscar validações pendentes:", error);
    throw new Error("Não foi possível buscar validações pendentes");
  }
};

const getValidationById = async (validation_id) => {
  if (!validation_id || validation_id.trim() === "") {
    console.error("validation_id é obrigatório");
    return null;
  }

  const params = {
    TableName: VALIDATION_USER_TABLE,
    Key: {
      validation_id: validation_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error("Erro ao buscar validação por ID:", error);
    return null;
  }
};

module.exports = {
  getValidationUser,
  getValidationById,
  createValidationUser,
  updateValidationUser,
  updateValidationAdmin,
  getPendingValidations,
};
