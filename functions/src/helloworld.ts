import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { WebhookEvent } from "@line/bot-sdk";
import { GPTMessage } from "./types/GPTMessage";
import axios from "axios";
const https = require("https");

const channelAccessToken =
  "7nEpdJkY/Ec2+QcJHyaR+vqUxf7chJmEF2OYYSbVh5wZvNvku6UgPIyIoEvy51KkCv0fLsl1Fogm0wrlwUWJrk1FrDWsCtoVM0jN6jxHab9mxGiD5nXf3zDTRlaoXlLOP9+UK1aHuuSGVevrJizYCQdB04t89/1O/w1cDnyilFU=";
const chatGPTAPIKey = "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";

export const helloWorld = functions.https.onRequest(async (req, res) => {
  if (req.method == "POST") {
    const events: WebhookEvent[] = req.body.events;
    for (const event of events) {
      switch (event.type) {
        case "message":
          if (event.message.type === "text") {
            const gptReponse = await getChatGPTResponse(event.message.text);
            await saveToFirestore(event.message.text, gptReponse);
            await sendLineMessage(event.replyToken, gptReponse);
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

const getChatGPTResponse = async (message: string) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chatGPTAPIKey}`,
    },
  };

  const firestore = admin.firestore();
  const messagesRef = firestore.collection("messages");
  const snapshot = await messagesRef.orderBy("createdAt").get();
  const documents = snapshot.docs.map((doc) => doc.data());

  let messages: GPTMessage[] = [
    {
      role: "system",
      content:
        "あなたは江戸時代の侍です。ユーザーの相談を侍らしく解決してください。",
    },
  ];

  documents.forEach((document) => {
    messages.push({
      role: "user",
      content: document.userMessage,
    });
    messages.push({
      role: "system",
      content: document.gptReponse,
    });
  });

  messages.push({
    role: "user",
    content: message,
  });

  const data = {
    model: "gpt-3.5-turbo",
    messages: messages,
  };

  const response = await axios.post(channelAccessToken, data, config);

  return response.data.choices[0].message.content.trim();
};
