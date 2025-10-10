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
    ProjectionExpression:
      "campanha_id, title, description, image, category, request_emergency, value_required, value_donated, users_donated, user_responsable, created_at, #status, address_street, address_number, address_complement, address_city, address_state, address_zipcode, address_neighborhood, have_address",
    ExpressionAttributeNames: {
      "#status": "status",
    },
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
    ProjectionExpression:
      "campanha_id, title, description, image, category, request_emergency, value_required, value_donated, users_donated, user_responsable, created_at, #status, address_street, address_number, address_complement, address_city, address_state, address_zipcode, address_neighborhood, have_address",
    ExpressionAttributeNames: {
      "#status": "status",
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
    ProjectionExpression:
      "campanha_id, title, description, image, category, request_emergency, value_required, value_donated, users_donated, user_responsable, created_at, #status, address_street, address_number, address_complement, address_city, address_state, address_zipcode, address_neighborhood, have_address",
    ExpressionAttributeNames: {
      "#status": "status",
    },
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
      address_street: address_street || null,
      address_number: address_number || null,
      address_complement: address_complement || null,
      address_city: address_city || null,
      address_state: address_state || null,
      address_zipcode: address_zipcode || null,
      address_neighborhood: address_neighborhood || null,
      have_address: have_address,
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

const updateStatusCampanha = async (campanha_id, status) => {
  const params = {
    TableName: CAMPANHA_TABLE,
    Key: { campanha_id },
    UpdateExpression: "SET status = :status",
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

const addComment = async (campanha_id, user, content) => {
  try {
    if (!user || !content) {
      throw new Error("Usuário ou conteúdo ausente");
    }

    const getParams = {
      TableName: CAMPANHA_TABLE,
      Key: { campanha_id },
    };

    const campanhaData = await dynamoDbClient.send(new GetCommand(getParams));

    if (!campanhaData.Item) {
      throw new Error("Campanha não encontrada");
    }

    const saveUser = {
      user_id: user.user_id,
      name: user.name,
      image: user.image || null,
    };

    const comments = campanhaData.Item.comments || [];
    const newComment = {
      comment_id: Date.now().toString(),
      user: saveUser,
      content,
      created_at: new Date().toISOString(),
      campanha_id,
    };
    comments.push(newComment);

    const updateParams = {
      TableName: CAMPANHA_TABLE,
      Key: { campanha_id },
      UpdateExpression: "SET comments = :comments",
      ExpressionAttributeValues: {
        ":comments": comments,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDbClient.send(new UpdateCommand(updateParams));
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getComments = async (campanha_id) => {
  try {
    const getParams = {
      TableName: CAMPANHA_TABLE,
      Key: { campanha_id },
      ProjectionExpression: "comments",
    };

    const campanhaData = await dynamoDbClient.send(new GetCommand(getParams));

    if (!campanhaData.Item) {
      throw new Error("Campanha não encontrada");
    }

    return { comments: campanhaData.Item.comments || [] };
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const deleteComment = async (campanha_id, comment_id) => {
  try {
    if (!comment_id) {
      throw new Error("Missing comment_id");
    }

    const getParams = {
      TableName: CAMPANHA_TABLE,
      Key: { campanha_id },
    };
    const campanhaData = await dynamoDbClient.send(new GetCommand(getParams));

    if (!campanhaData.Item) {
      throw new Error("Campanha not found");
    }

    const comments = campanhaData.Item.comments || [];
    const updatedComments = comments.filter(
      (comment) => comment.comment_id !== comment_id
    );

    if (comments.length === updatedComments.length) {
      throw new Error("Comment not found");
    }

    const updateParams = {
      TableName: CAMPANHA_TABLE,
      Key: { campanha_id },
      UpdateExpression: "SET comments = :comments",
      ExpressionAttributeValues: {
        ":comments": updatedComments,
      },
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDbClient.send(new UpdateCommand(updateParams));
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = {
  searchCampanhas,
  findById,
  findAllByUser,
  createCampanha,
  deleteCampanha,
  updateCampanha,
  addComment,
  getComments,
  deleteComment,
  updateStatusCampanha,
};
