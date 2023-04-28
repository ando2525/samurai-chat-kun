import * as functions from "firebase-functions";
import { WebhookEvent } from "@line/bot-sdk";
const https = require("https");

const channelAccessToken =
  "7nEpdJkY/Ec2+QcJHyaR+vqUxf7chJmEF2OYYSbVh5wZvNvku6UgPIyIoEvy51KkCv0fLsl1Fogm0wrlwUWJrk1FrDWsCtoVM0jN6jxHab9mxGiD5nXf3zDTRlaoXlLOP9+UK1aHuuSGVevrJizYCQdB04t89/1O/w1cDnyilFU=";

exports.helloWorld = functions.https.onRequest((req, res) => {
  if (req.method == "POST") {
    const url = "https://api.line.me/v2/bot/message/reply";
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
    };

    req.body["events"].forEach((event: WebhookEvent) => {
      switch (event.type) {
        case "message":
          if (event.message.type === "text") {
            const data = JSON.stringify({
              replyToken: event.replyToken,
              messages: [
                {
                  type: "text",
                  text: event.message.text,
                },
              ],
            });

            const line = https.request(url, options);
            line.write(data);
            line.end();
          }
      }
    });
  }
});
