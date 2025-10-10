const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({ region: "us-east-1" });
const dynamoDbClient = DynamoDBDocumentClient.from(ddbClient);

const DEPOSIT_TABLE = process.env.DEPOSIT_TABLE;

const createSolicitacaoDeposito = async (user, campanha, request_message) => {
  const params = {
    TableName: DEPOSIT_TABLE,
    Item: {
      request_id: Date.now().toString(),
      user,
      campanha,
      status: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      justification_admin: null,
      request_message: request_message || null,
    },
    ReturnValues: "ALL_OLD",
  };

  try {
    const result = await dynamoDbClient.send(new PutCommand(params));
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getMySolicitacoesDeposito = async (user_id) => {
  const params = {
    TableName: DEPOSIT_TABLE,
    FilterExpression: "user.user_id = :user_id",
    ExpressionAttributeValues: {
      ":user_id": user_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const updateSolicitacaoDepositoStatus = async (
  request_id,
  newStatus,
  justification_admin
) => {
  const params = {
    TableName: DEPOSIT_TABLE,
    Key: { request_id },
    UpdateExpression:
      "set #status = :status, justification_admin = :justification_admin, updated_at = :updated_at",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":status": newStatus,
      ":justification_admin": justification_admin || null,
      ":updated_at": new Date().toISOString(),
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamoDbClient.send(new UpdateCommand(params));
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  createSolicitacaoDeposito,
  getMySolicitacoesDeposito,
  updateSolicitacaoDepositoStatus,
};
