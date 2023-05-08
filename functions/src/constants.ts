import * as functions from "firebase-functions";

export const OPENAI_API_ENDPOINT = functions.config().openai.api_endpoint;
export const OPENAI_API_KEY = functions.config().openai.api_key;
export const LINE_API_ENDPOINT = functions.config().line.api_endpoint;
export const LINE_CHANNEL_ACCESS_TOKEN =
  functions.config().line.channel_access_token;
