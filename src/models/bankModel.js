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

const BANK_TABLE = process.env.BANK_TABLE;

const searchBanks = async (searchBody) => {
  const { search, page, itemsPerPage } = searchBody;

  itemsPerPage = itemsPerPage ?? 10;
  page = page ?? 1;

  const params = {
    TableName: BANK_TABLE,
    FilterExpression: "contains(#name, :search) OR contains(bank_id, :search)",
    ExpressionAttributeNames: {
      "#name": "name",
    },
    ExpressionAttributeValues: {
      ":search": search,
    },
    ProjectionExpression: "bank_id, name, fullName",
    Limit: itemsPerPage,
    ExclusiveStartKey:
      page > 1 ? { bank_id: (page - 1) * itemsPerPage } : undefined,
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items || [];
  } catch (error) {
    console.error("Erro ao buscar bancos:", error);
    return [];
  }
};

const getBankById = async (bank_id) => {
  const params = {
    TableName: BANK_TABLE,
    Key: { bank_id },
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item || null;
  } catch (error) {
    console.error("Erro ao buscar banco:", error);
    return null;
  }
};

module.exports = {
  searchBanks,
  getBankById,
};
