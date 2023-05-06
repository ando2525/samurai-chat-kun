import * as admin from "firebase-admin";
import { helloWorld } from "./helloworld";

admin.initializeApp();
exports.helloWorld = helloWorld;
