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

const CONFIG_RECEIPT_TABLE = process.env.CONFIG_RECEIPT_TABLE;

const saveConfigReceipt = async (configData) => {
  const { user_id, bank, agency, account_number, account_type, cnpj } =
    configData;

  const params = {
    TableName: CONFIG_RECEIPT_TABLE,
    Item: {
      receipt_id: new Date().now().toString(),
      user_id,
      bank,
      agency,
      account_number,
      account_type,
      cnpj,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "PENDING",
    },
    ConditionExpression: "attribute_not_exists(user_id)",
  };

  try {
    return await dynamoDbClient.send(new PutCommand(params));
  } catch (error) {
    console.error(error);
    throw new Error("Não foi possível salvar configuração de recebimento");
  }
};

const updateConfigReceipt = async (config_id, updateData) => {
  const { bank, agency, account_number, account_type, cnpj } = updateData;

  const params = {
    TableName: CONFIG_RECEIPT_TABLE,
    Key: { config_id },
    UpdateExpression:
      "SET bank = :bank, agency = :agency, account_number = :account_number, account_type = :account_type, updated_at = :updated_at",
    ExpressionAttributeValues: {
      ":bank": bank,
      ":agency": agency,
      ":account_number": account_number,
      ":account_type": account_type,
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

// Get Config Receipt by User ID
const getConfigReceiptByUserId = async (user_id) => {
  const params = {
    TableName: CONFIG_RECEIPT_TABLE,
    FilterExpression: "user_id = :user_id",
    ExpressionAttributeValues: {
      ":user_id": user_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error(error);
    throw new Error(
      "Não foi possível buscar configuração de recebimento do usuário"
    );
  }
};

// Update Status of Config Receipt
const updateStatusConfigReceipt = async (config_id, status) => {
  const params = {
    TableName: CONFIG_RECEIPT_TABLE,
    Key: { config_id },
    UpdateExpression: "SET #status = :status",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":status": status,
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
  saveConfigReceipt,
  updateConfigReceipt,
  getConfigReceiptByUserId,
  updateStatusConfigReceipt,
};
