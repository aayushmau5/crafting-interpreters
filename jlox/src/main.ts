import { readFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";

import Scanner from "./scanner";
import { SyntaxError } from "./errors";

export default class Lox {
  static hadError = false;
  static main(args: string[]) {
    if (args.length > 1) {
      console.log("Usage: jlox [script]");
      process.exit(64);
    } else if (args.length === 1) {
      this.runFile(args[0]);
    } else {
      this.runPrompt();
    }
  }

  static runFile(path: string) {
    if (this.hadError) {
      process.exit(65);
    }
    const sourceCode = readFileSync(resolve(path), "utf-8");
    this.run(sourceCode);
  }

  static runPrompt() {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "jlox > ",
    });

    rl.on("line", (line) => {
      line = line.trim();
      if (line === "exit") rl.close();

      if (line) {
        this.run(line);
        this.hadError = false;
      }

      rl.prompt();
    });

    rl.on("close", () => {
      process.exit(0);
    });

    rl.prompt();
  }

  static run(source: string) {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    console.log(tokens);
  }

  static error(line: number, message: string) {
    this.report(line, "", message);
  }

  static report(line: number, where: string, message: string) {
    this.hadError = true;
    throw new SyntaxError(line, where, message);
  }
}

Lox.runPrompt();
