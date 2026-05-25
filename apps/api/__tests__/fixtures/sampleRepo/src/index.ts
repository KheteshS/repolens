import { helper } from "./utils";
import express from "express";

export function main() {
  const app = express();
  helper();
  return app;
}

export default main;
