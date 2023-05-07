import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GPTMessage } from "./types/GPTMessage";
import axios from "axios";
const LINE_CHANNEL_ACCESS_TOKEN =
  "7nEpdJkY/Ec2+QcJHyaR+vqUxf7chJmEF2OYYSbVh5wZvNvku6UgPIyIoEvy51KkCv0fLsl1Fogm0wrlwUWJrk1FrDWsCtoVM0jN6jxHab9mxGiD5nXf3zDTRlaoXlLOP9+UK1aHuuSGVevrJizYCQdB04t89/1O/w1cDnyilFU=";
const OPENAI_API_KEY = "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";
const OPENAI_API_ENDPOINT =
  "https://api.openai.com/v1/engines/gpt-3.5-turbo/completions";
const LINE_API_ENDPOINT = "https://api.line.me/v2/bot/message/reply";

export const helloWorld = functions.https.onRequest(async (req, res) => {
  if (req.method == "POST") {
    for (const event of req.body.events) {
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

const sendLineMessage = async (replyToken: string, message: string) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  };

  const data = JSON.stringify({
    replyToken,
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  });

  await axios.post(LINE_API_ENDPOINT, data, config);
};

const getChatGPTResponse = async (message: string) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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

  const response = await axios.post(OPENAI_API_ENDPOINT, data, config);

  return response.data.choices[0].message.content.trim();
};
