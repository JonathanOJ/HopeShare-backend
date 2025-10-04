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

const CAMPANHA_TABLE = process.env.CAMPANHA_TABLE;

const findById = async (campanha_id) => {
  const params = {
    TableName: CAMPANHA_TABLE,
    Key: { campanha_id },
  };

  try {
    const result = await dynamoDbClient.send(new GetCommand(params));
    return result.Item;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const findAllByUser = async (user_id) => {
  const params = {
    TableName: CAMPANHA_TABLE,
    FilterExpression: "user_responsable.user_id = :user_id",
    ExpressionAttributeValues: {
      ":user_id": user_id,
    },
  };

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result.Items;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const searchCampanhas = async (searchBody) => {
  const { search, category, page, itemsPerPage } = searchBody;
  const offset = itemsPerPage * (page - 1);

  const params = {
    TableName: CAMPANHA_TABLE,
    Limit: itemsPerPage,
  };

  const filterExpressions = [];
  const expressionAttributeValues = {};

  if (search) {
    filterExpressions.push("contains(title, :search)");
    expressionAttributeValues[":search"] = search;
  }

  if (category) {
    filterExpressions.push("contains(category, :category)");
    expressionAttributeValues[":category"] = category;
  }

  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(" AND ");
    params.ExpressionAttributeValues = expressionAttributeValues;
  }

  try {
    const result = await dynamoDbClient.send(new ScanCommand(params));
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// export interface Campanha {
//   campanha_id: string;
//   title: string;
//   description: string;
//   image: string;
//   category: string[];
//   categoriesFormatted: string;
//   users_donated: UserDonatedModel[];
//   value_required: number;
//   value_donated: number;
//   request_emergency: boolean;
//   emergency: boolean;
//   user_responsable: AuthUser;
//   created_at: Date | null;
//   progress_percentage?: number;
//   status: StatusCampanha;
//   address_street: string;
//   address_number: string;
//   address_complement: string;
//   address_city: string;
//   address_state: string;
//   address_zipcode: string;
//   address_neighborhood: string;
//   have_address: boolean;
// }

const createCampanha = async (campanha) => {
  const dateUTC = new Date().toISOString();
  const newId = Date.now().toString();

  const {
    title,
    description,
    image,
    category,
    request_emergency,
    value_required,
    user_responsable,
    status,
    address_street,
    address_number,
    address_complement,
    address_city,
    address_state,
    address_zipcode,
    address_neighborhood,
    have_address,
  } = campanha;

  const params = {
    TableName: CAMPANHA_TABLE,
    Item: {
      campanha_id: newId,
      title,
      description,
      image,
      category,
      request_emergency,
      value_required,
      value_donated: 0,
      users_donated: [],
      user_responsable,
      created_at: dateUTC,
      status,
      address_street,
      address_number,
      address_complement,
      address_city,
      address_state,
      address_zipcode,
      address_neighborhood,
      have_address,
    },
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    return { campanha_id: newId, ...campanha };
  } catch (error) {
    console.error(error);
    return null;
  }
};

const updateCampanha = async (campanha) => {
  const { campanha_id, ...updateFields } = campanha;

  const updateExpression = [];
  const expressionAttributeValues = {};

  for (const key in updateFields) {
    updateExpression.push(`${key} = :${key}`);
    expressionAttributeValues[`:${key}`] = updateFields[key];
  }

  const params = {
    TableName: CAMPANHA_TABLE,
    Key: { campanha_id },
    UpdateExpression: `SET ${updateExpression.join(", ")}`,
    ExpressionAttributeValues: expressionAttributeValues,
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

const deleteCampanha = async (campanha_id) => {
  const params = {
    TableName: CAMPANHA_TABLE,
    Key: { campanha_id },
  };

  try {
    const result = await dynamoDbClient.send(new DeleteCommand(params));
    return result.Attributes ? true : false;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const donate = async (donation) => {
  const { campanha_id, donated_value } = donation;

  const appendDonationParams = {
    TableName: CAMPANHA_TABLE,
    Key: { campanha_id },
    UpdateExpression:
      "SET users_donated = list_append(users_donated, :donation)",
    ExpressionAttributeValues: {
      ":donation": [donation],
    },
    ReturnValues: "ALL_NEW",
  };

  const updateTotalParams = {
    TableName: CAMPANHA_TABLE,
    Key: { campanha_id },
    UpdateExpression: "SET value_donated = value_donated + :donated_value",
    ExpressionAttributeValues: {
      ":donated_value": donated_value,
    },
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamoDbClient.send(
      new UpdateCommand(appendDonationParams)
    );
    await dynamoDbClient.send(new UpdateCommand(updateTotalParams));
    return result.Attributes;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  searchCampanhas,
  findById,
  findAllByUser,
  createCampanha,
  deleteCampanha,
  updateCampanha,
  donate,
};
