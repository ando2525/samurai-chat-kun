import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Message, WebhookEvent } from "@line/bot-sdk";
import { GPTMessage } from "./types/GPTMessage";
import axios from "axios";
import {
  LINE_API_ENDPOINT,
  LINE_CHANNEL_ACCESS_TOKEN,
  OPENAI_API_ENDPOINT,
  OPENAI_API_KEY,
} from "./constants";

const IMAGE_URL =
  "https://firebasestorage.googleapis.com/v0/b/samurai-chat-kun-398a4.appspot.com/o/gsap-greensock.svg?alt=media&token=f78fa587-5d50-458c-9e6c-c95b66e0388d";

export const helloWorld = functions.https.onRequest(async (req, res) => {
  if (req.method == "POST") {
    const events: WebhookEvent[] = req.body.events;
    for (const event of events) {
      switch (event.type) {
        case "message":
          if (event.message.type === "text") {
            if (event.message.text === "画像") {
              await sendLineMessage(event.replyToken, [
                {
                  type: "image",
                  originalContentUrl: IMAGE_URL,
                  previewImageUrl: IMAGE_URL,
                  quickReply: {
                    items: [
                      {
                        type: "action",
                        action: {
                          type: "message",
                          label: "Yesを送信",
                          text: "Yes",
                        },
                      },
                    ],
                  },
                },
              ]);
            }

            const gptReponse = await getChatGPTResponse(event.message.text);
            await saveToFirestore(event.message.text, gptReponse);
            await sendLineMessage(event.replyToken, [
              { type: "text", text: gptReponse },
            ]);
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

const sendLineMessage = async (replyToken: string, messages: Message[]) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  };

  const data = JSON.stringify({
    replyToken,
    messages: messages,
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
      content: "",
      // "あなたは江戸時代の侍です。ユーザーの相談を侍らしく解決してください。",
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

  return response.data.choices[0].message.content.trim() as string;
};
