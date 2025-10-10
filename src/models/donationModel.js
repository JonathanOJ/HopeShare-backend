const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDbClient = DynamoDBDocumentClient.from(ddbClient);

const DONATION_TABLE = process.env.DONATION_TABLE;

const createDonation = async (donationData) => {
  const params = {
    TableName: DONATION_TABLE,
    Item: donationData,
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    console.log(`✅ Doação criada: ${donationData.payment_id}`);
    return donationData;
  } catch (error) {
    console.error("Erro ao criar doação:", error);
    throw new Error(`Não foi possível criar doação: ${error.message}`);
  }
};

// Busca doação por payment_id
const findById = async (payment_id) => {
  const params = {
    TableName: DONATION_TABLE,
    Key: { payment_id },
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error("Erro ao buscar doação:", error);
    return null;
  }
};

const findByUserId = async (user_id) => {
  const params = {
    TableName: DONATION_TABLE,
    FilterExpression: "user_id = :user_id",
    ExpressionAttributeValues: {
      ":user_id": user_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error("Erro ao buscar doações do usuário:", error);
    return [];
  }
};

const findByCampanhaId = async (campanha_id) => {
  const params = {
    TableName: DONATION_TABLE,
    FilterExpression: "campanha_id = :campanha_id",
    ExpressionAttributeValues: {
      ":campanha_id": campanha_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error("Erro ao buscar doações da campanha:", error);
    return [];
  }
};

// Atualiza o status de uma doação
const updateStatus = async (payment_id, status) => {
  const updateExpressions = ["#status = :status", "updated_at = :updated_at"];
  const expressionAttributeValues = {
    ":status": status,
    ":updated_at": new Date().toISOString(),
  };
  const expressionAttributeNames = {
    "#status": "status",
  };

  const params = {
    TableName: DONATION_TABLE,
    Key: { payment_id },
    UpdateExpression: `SET ${updateExpressions.join(", ")}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamoDbClient.send(new UpdateCommand(params));
    console.log(`✅ Status da doação ${payment_id} atualizado para: ${status}`);
    return result.Attributes;
  } catch (error) {
    console.error("Erro ao atualizar status da doação:", error);
    throw new Error(
      `Não foi possível atualizar status da doação: ${error.message}`
    );
  }
};

const findAll = async (status = null) => {
  const params = {
    TableName: DONATION_TABLE,
  };

  if (status) {
    params.FilterExpression = "#status = :status";
    params.ExpressionAttributeNames = { "#status": "status" };
    params.ExpressionAttributeValues = { ":status": status };
  }

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error("Erro ao listar doações:", error);
    return [];
  }
};

module.exports = {
  createDonation,
  findById,
  findByUserId,
  findByCampanhaId,
  updateStatus,
  findAll,
};
