import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient.mjs";
import { v4 as uuidv4 } from "uuid";

export const handler = async (event) => {
  console.log(`Received Event: `, JSON.stringify(event, null, 2));
  try {
    let body;

    switch (event.httpMethod) {
      case "GET":
        if (event.queryStringParameters !== null) {
          body = await getProductByCategory(event);
        } else if (event.pathParameters !== null) {
          body = await getProduct(event.pathParameters.id);
        } else {
          body = await getAllProduct();
        }
        break;
      case "POST":
        body = await createProduct(event);
        break;
      case "DELETE":
        body = await deleteProduct(event.pathParameters.id);
        break;
      case "PUT":
        body = await updateProduct(event);
        break;
      default:
        throw new Error(`Unsupported route: "${event.httpMethod}"`);
    }
    console.log("body", body);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully finished operation "${event.httpMethod}"`,
        body: body,
      }),
    };
  } catch (error) {
    console.log("error", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to perform operation!",
        errorMsg: error.message,
        errorStack: error.stack,
      }),
    };
  }
};

export const getProduct = async (productId) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: productId }),
    };

    const { Item } = await ddbClient.send(new GetItemCommand(params));
    console.log("Item", Item);
    return Item ? unmarshall(Item) : {};
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

export const getAllProduct = async () => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };
    const { Items } = await ddbClient.send(new ScanCommand(params));
    console.log("Items", Items);
    return Items ? Items.map((item) => unmarshall(item)) : {};
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

const getProductByCategory = async (event) => {
  try {
    const productId = event.pathParameters.id;
    const category = event.queryStringParameters.category;

    const params = {
      KeyConditionExpression: "id = :productId",
      FilterExpression: "contains (category, :category)",
      ExpressionAttributeValues: {
        ":productId": { S: productId },
        ":category": { S: category },
      },
      TableName: process.env.DYNAMODB_TABLE_NAME,
    };
    const { Items } = await ddbClient.send(new QueryCommand(params));
    console.log("Items", Items);
    return Items.map((item) => unmarshall(item));
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

export const createProduct = async (event) => {
  try {
    const requestBody = JSON.parse(event.body);
    const productId = uuidv4();
    requestBody.id = productId;
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(requestBody || {}),
    };

    const createResult = await ddbClient.send(new PutItemCommand(params));
    console.log("createResult", createResult);
    return createResult;
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

export const deleteProduct = async (productId) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: productId }),
    };

    const deleteResult = await ddbClient.send(new DeleteItemCommand(params));
    console.log("deleteResult", deleteResult);
    return deleteResult;
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

export const updateProduct = async (event) => {
  try {
    // const requestBody = JSON.parse(event.body);
    // const objKeys = Object.keys(requestBody);
    // console.log(`requestbody: "${requestBody}" and objKeys: "${objKeys}"`);
    // const params = {
    //   TableName: process.env.DYNAMODB_TABLE_NAME,
    //   Key: marshall({ id: event.pathParameters.id }),
    //   UpdateExpression: `SET ${objKeys
    //     .map((_, index) => `#key${index} = :value${index}`)
    //     .join(", ")}`,
    //   ExpressionAttributeNames: objKeys.reduce(
    //     (acc, key, index) => ({
    //       ...acc,
    //       [`#key${index}`]: key,
    //     }),
    //     {}
    //   ),
    //   ExpressionAttributeValues: marshall(
    //     objKeys.reduce((acc, key, index) => ({
    //       ...acc,
    //       [`:value${index}`]: requestBody[key],
    //     })),
    //     {}
    //   ),
    // };
    // const updatedResult = await ddbClient.send(new UpdateItemCommand(params));
    // console.log('updatedResult', updatedResult)
    // return updatedResult;
    const requestBody = JSON.parse(event.body);
    const objKeys = Object.keys(requestBody);
    console.log(`updateProduct function. requestBody : "${requestBody}", objKeys: "${objKeys}"`);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ id: event.pathParameters.id }),
      UpdateExpression: `SET ${objKeys.map((_, index) => `#key${index} = :value${index}`).join(", ")}`,
      ExpressionAttributeNames: objKeys.reduce((acc, key, index) => ({
          ...acc,
          [`#key${index}`]: key,
      }), {}),
      ExpressionAttributeValues: marshall(objKeys.reduce((acc, key, index) => ({
          ...acc,
          [`:value${index}`]: requestBody[key],
      }), {})),
    };

    console.log('params', params);

    const updateResult = await ddbClient.send(new UpdateItemCommand(params));
    console.log(updateResult);
    return updateResult;
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};
