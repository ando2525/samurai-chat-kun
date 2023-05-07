import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import { WebhookEvent } from "@line/bot-sdk";
import { GPTMessage } from "./types/GPTMessage";
import axios from "axios";
const https = require("https");

const channelAccessToken =
  "7nEpdJkY/Ec2+QcJHyaR+vqUxf7chJmEF2OYYSbVh5wZvNvku6UgPIyIoEvy51KkCv0fLsl1Fogm0wrlwUWJrk1FrDWsCtoVM0jN6jxHab9mxGiD5nXf3zDTRlaoXlLOP9+UK1aHuuSGVevrJizYCQdB04t89/1O/w1cDnyilFU=";
const chatGPTAPIKey = "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";

export const helloWorld = functions.https.onRequest(async (req, res) => {
  if (req.method == "POST") {
    for (const event of req.body.events) {
      switch (event.type) {
        case "message":
          if (event.message.type === "text") {
            const gptResponse = await chatGPTResponse(event.message.text);
            await saveToFirestore(event.message.text, gptResponse);
            await sendLineMessage(event.replyToken, gptResponse);
          }
      }
    }
  }
});

const saveToFirestore = async (message: string, gptReponse: string) => {
  const firestore = admin.firestore();
  const docRef = firestore.collection("messages").doc();
  await docRef.set({
    userMessage: message,
    gptReponse: gptReponse,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const sendLineMessage = (replyToken: string, message: string) => {
  const url = "https://api.line.me/v2/bot/message/reply";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
  };

  const data = JSON.stringify({
    replyToken: replyToken,
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  });

  const line = https.request(url, options);
  line.write(data);
  line.end();
};

const chatGPTResponse = async (message: string) => {
  const url = "https://api.openai.com/v1/chat/completions";
  const messages: GPTMessage[] = [
    {
      role: "system",
      content:
        "あなたは5歳の幼児です。語尾を「でちゅ」にして、ユーザーの相談を解決してください",
    },
    { role: "user", content: message },
  ];

  const body = {
    model: "gpt-3.5-turbo",
    messages: messages,
  };
  const res = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chatGPTAPIKey}`,
    },
  });
  return res.data.choices[0].message.content.trim();
};
