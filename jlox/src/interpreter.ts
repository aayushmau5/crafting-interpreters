/*
Right now I'm getting an AST from the parser(only for expressions now)
ex. an expression -> 1 / 2 - 3
AST -> (- (/ 1 2) 3)

Now, it's time to evaluate that AST(or expression) and produce a value

code that knows how to evaluate that tree and produce a result

1. what kinds of values do we produce?

Scope

Lexical Scope(aka static scope) is a specific style of scoping where the text
of the program itself shows where a scope begins and ends.

Variables are lexically scoped.

Methods and fields on objects are dynamically scoped(at runtime).

Scope and environments are close cousins.
The former is the theoretical concept, and the latter is the machinery that implements it.

For lox, scopes are controlled by {}(block scope).

parent-pointer tree
*/

import {
  Assign,
  Binary,
  Block,
  Expr,
  Expression,
  Grouping,
  Literal,
  Print,
  Stmt,
  StmtVisitor,
  Unary,
  Var,
  Variable,
  Visitor,
} from "./ast";
import { TokenType, Token } from "./token";
import { RuntimeError } from "./errors";
import { Lox } from "./main";
import { Environment } from "./environment";
import { LoxObject } from "./types";

export class Interpreter implements Visitor<LoxObject>, StmtVisitor<void> {
  // statements produce no values. Therefore, the return type is void

  environment: Environment = new Environment();

  visitLiteralExpr(expr: Literal): LoxObject {
    return expr.value;
  }

  visitGroupingExpr(expr: Grouping): LoxObject {
    return this.evaluate(expr.expression);
  }

  visitUnaryExpr(expr: Unary): LoxObject {
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.BANG:
        return !this.isTruthy(right);
      case TokenType.MINUS:
        this.checkNumberOperand(expr.operator, right);
        return -(right as number);
    }

    return null;
  }

  visitBinaryExpr(expr: Binary): LoxObject {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator.type) {
      case TokenType.GREATER:
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) > (right as number);
      case TokenType.GREATER_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) >= (right as number);
      case TokenType.LESS:
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) < (right as number);
      case TokenType.LESS_EQUAL:
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) <= (right as number);
      case TokenType.MINUS:
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) - (right as number);
      case TokenType.PLUS:
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }

        if (typeof left === "string" && typeof right === "string") {
          return left + right;
        }

        throw new RuntimeError(
          expr.operator,
          "Operands must be two numbers or two strings."
        );
      case TokenType.SLASH:
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) / (right as number);
      case TokenType.STAR:
        this.checkNumberOperands(expr.operator, left, right);
        return (left as number) * (right as number);
      case TokenType.BANG_EQUAL:
        return !this.isEqual(left, right);
      case TokenType.EQUAL_EQUAL:
        return this.isEqual(left, right);
    }

    return null;
  }

  visitExpressionStmt(stmt: Expression) {
    this.evaluate(stmt.expression); // discard this value
    return;
  }

  visitPrintStmt(stmt: Print) {
    const value = this.evaluate(stmt.expression);
    console.log(this.stringify(value));
    return;
  }

  visitVarStmt(stmt: Var) {
    let value = null;
    if (stmt.initializer !== null) {
      value = this.evaluate(stmt.initializer);
    }
    this.environment.define(stmt.name.lexeme, value);
  }

  visitAssignExpr(expr: Assign) {
    const value = this.evaluate(expr.value);
    this.environment.assign(expr.name, value);
    return value;
  }

  visitVariableExpr(expr: Variable) {
    return this.environment.get(expr.name);
  }

  visitBlockStmt(stmt: Block) {
    this.executeBlock(stmt.statements, new Environment(this.environment));
  }

  private evaluate(expr: Expr): LoxObject {
    return expr.accept(this);
  }

  private isTruthy(object: LoxObject) {
    // only null and false are falsy
    if (object === null) return false;
    if (typeof object === "boolean") return object;
    return true;
  }

  private isEqual(a: LoxObject, b: LoxObject): boolean {
    if (a === null && b === null) return true;
    if (a === null) return false;

    return a === b;
  }

  private checkNumberOperand(operator: Token, operand: LoxObject) {
    if (typeof operand === "number") return;
    throw new RuntimeError(operator, "Operand must be a number.");
  }

  private checkNumberOperands(
    operator: Token,
    left: LoxObject,
    right: LoxObject
  ) {
    if (typeof left === "number" && typeof right === "number") return;
    throw new RuntimeError(operator, "Operands must be numbers.");
  }

  private stringify(object: LoxObject): string {
    if (object === null) return "nil";

    if (typeof object === "number") {
      let text = object.toString();
      if (text.endsWith(".0")) {
        text = text.substring(0, text.length - 2);
      }
      return text;
    }

    return object.toString();
  }

  interpret(statements: Stmt[]) {
    try {
      for (const statement of statements) {
        this.execute(statement);
      }
    } catch (err) {
      Lox.runtimeError(err as RuntimeError);
    }
  }

  private execute(stmt: Stmt) {
    stmt.accept(this);
  }

  private executeBlock(statements: Stmt[], environment: Environment) {
    const previous = this.environment;
    try {
      this.environment = environment;

      for (const statement of statements) {
        this.execute(statement);
      }
    } finally {
      this.environment = previous;
    }
  }
}
