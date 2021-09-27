import { readFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { inspect } from "util";

import Scanner from "./scanner";
import { RuntimeError, SyntaxError } from "./errors";
import { Token, TokenType } from "./token";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";
import { Resolver } from "./resolver";

export class Lox {
  private static interpreter = new Interpreter();

  static hadError = false;
  static hadRuntimeError = false;
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
    if (this.hadRuntimeError) {
      process.exit(70);
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
    console.log("tokens");
    console.log(inspect(tokens, false, null, true));
    const parser = new Parser(tokens);
    const statments = parser.parse();

    if (this.hadError) return;

    const resolver = new Resolver(this.interpreter);
    resolver.resolve(statments);

    if (this.hadError) return;

    console.log("ast");
    console.log(inspect(statments, false, null, true));

    this.interpreter.interpret(statments);
  }

  static error(line: number, message: string) {
    this.report(line, "", message);
  }

  static report(line: number, where: string, message: string) {
    this.hadError = true;
    throw new SyntaxError(line, where, message);
  }

  static parseError(token: Token, message: string) {
    if (token.type == TokenType.EOF) {
      this.report(token.line, " at end", message);
    } else {
      this.report(token.line, " at '" + token.lexeme + "'", message);
    }
  }

  static runtimeError(error: RuntimeError) {
    console.log(`${error.message}\n[line ${error.token.line}]`);
    this.hadRuntimeError = true;
  }
}

Lox.runPrompt();
