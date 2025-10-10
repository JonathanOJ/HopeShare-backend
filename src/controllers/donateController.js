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
  findById,
  findAll,
  donate,
  updateStatusDonate,
  refound,
};
