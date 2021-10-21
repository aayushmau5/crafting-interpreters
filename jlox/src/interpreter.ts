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
  Call,
  Class,
  Expr,
  Expression,
  Function,
  Get,
  Grouping,
  If,
  Literal,
  Logical,
  Print,
  Return,
  Set,
  Stmt,
  StmtVisitor,
  Super,
  This,
  Unary,
  Var,
  Variable,
  Visitor,
  While,
} from "./ast";
import { TokenType, Token } from "./token";
import { RuntimeError } from "./errors";
import { Lox } from "./main";
import { Environment } from "./environment";
import {
  LoxCallable,
  LoxClass,
  LoxFunction,
  LoxInstance,
  LoxObject,
} from "./types";

class Clock extends LoxCallable {
  arity() {
    return 0;
  }

  call(_interpreter: Interpreter, _args: LoxObject[]) {
    return Date.now() / 1000;
  }

  toString() {
    return "<native fn 'clock'>";
  }
}

export class Interpreter implements Visitor<LoxObject>, StmtVisitor<void> {
  // statements produce no values. Therefore, the return type is void
  globals: Environment = new Environment(); // holds a fixed reference to the outermost global environment
  environment: Environment = this.globals;
  locals = new Map<Expr, number>();

  constructor() {
    this.globals.define("clock", new Clock()); // the native clock function
  }

  visitLiteralExpr(expr: Literal): LoxObject {
    return expr.value;
  }

  visitLogicalExpr(expr: Logical): LoxObject {
    const left = this.evaluate(expr.left);
    if (expr.operator.type === TokenType.OR) {
      if (this.isTruthy(left)) {
        return left;
      }
    } else {
      if (!this.isTruthy(left)) {
        return left;
      }
    }
    return this.evaluate(expr.right); // return the value itself
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

  visitIfStmt(stmt: If) {
    if (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.thenBranch);
    } else if (stmt.elseBranch !== null) {
      this.execute(stmt.elseBranch);
    }
    return;
  }

  visitWhileStmt(stmt: While) {
    while (this.isTruthy(this.evaluate(stmt.condition))) {
      this.execute(stmt.body);
    }
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
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      this.environment.assignAt(distance, expr.name, value);
    } else {
      this.globals.assign(expr.name, value);
    }
    this.environment.assign(expr.name, value);
    return value;
  }

  visitVariableExpr(expr: Variable) {
    return this.lookupVariable(expr.name, expr);
  }

  visitBlockStmt(stmt: Block) {
    this.executeBlock(stmt.statements, new Environment(this.environment));
  }

  visitCallExpr(expr: Call) {
    const callee = this.evaluate(expr.callee);

    const args = [];
    for (const arg of expr.args) {
      args.push(this.evaluate(arg));
    }

    if (!(callee instanceof LoxCallable)) {
      throw new RuntimeError(
        expr.paren,
        "Can only call functions and classes."
      );
    }

    const func = callee as LoxCallable;
    if (args.length !== func.arity()) {
      throw new RuntimeError(
        expr.paren,
        `Expect ${func.arity()} arguments but got ${args.length}.`
      );
    }
    return func.call(this, args);
  }

  visitGetExpr(expr: Get) {
    const object = this.evaluate(expr.object);
    if (object instanceof LoxInstance) {
      return object.get(expr.name);
    }
    throw new RuntimeError(expr.name, "Only instance have properties.");
  }

  visitSetExpr(expr: Set) {
    const object = this.evaluate(expr.object);
    if (!(object instanceof LoxInstance)) {
      throw new RuntimeError(expr.name, "Only instance have fields.");
    }
    const value = this.evaluate(expr.value);
    object.set(expr.name, value);
    return value;
  }

  visitThisExpr(expr: This) {
    return this.lookupVariable(expr.keyword, expr);
  }

  visitFunctionStmt(stmt: Function) {
    const func = new LoxFunction(stmt, this.environment);
    this.environment.define(stmt.name.lexeme, func);
    return;
  }

  visitReturnStmt(stmt: Return) {
    let value = null;
    if (stmt.value != null) value = this.evaluate(stmt.value);

    throw new LoxFunction.Return(value);
  }

  visitClassStmt(stmt: Class) {
    let superclass: LoxObject = null;
    if (stmt.superclass !== null) {
      superclass = this.evaluate(stmt.superclass);
      if (!(superclass instanceof LoxClass)) {
        throw new RuntimeError(
          stmt.superclass.name,
          "Superclass must be a class."
        );
      }
    }

    this.environment.define(stmt.name.lexeme, null);

    if (stmt.superclass !== null) {
      this.environment = new Environment(this.environment);
      this.environment.define("super", superclass);
    }

    const methods = new Map<string, LoxFunction>();
    for (const method of stmt.methods) {
      // iterating through every method
      const isInitializer = method.name.lexeme === "init"; // if method is an initializer(/constructor)
      const fn = new LoxFunction(method, this.environment, isInitializer);
      methods.set(method.name.lexeme, fn);
    }

    const klass = new LoxClass(stmt.name.lexeme, superclass!, methods);

    if (superclass !== null) {
      this.environment = this.environment.enclosing!;
    }

    this.environment.assign(stmt.name, klass);
    return;
  }

  visitSuperExpr(expr: Super) {
    const distance = this.locals.get(expr);
    const superclass = this.environment.getAt(distance!, "super") as LoxClass;
    const object = this.environment.getAt(distance! - 1, "this") as LoxInstance;

    const method = superclass!.findMethod(expr.method.lexeme);

    if (method === null) {
      throw new RuntimeError(
        expr.method,
        `Undefined property '${expr.method.lexeme}'.'`
      );
    }

    return method.bind(object);
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

  execute(stmt: Stmt) {
    return stmt.accept(this);
  }

  executeBlock(statements: Stmt[], environment: Environment) {
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

  resolve(expr: Expr, depth: number) {
    this.locals.set(expr, depth);
  }

  lookupVariable(name: Token, expr: Expr): LoxObject {
    const distance = this.locals.get(expr);
    if (distance !== undefined) {
      return this.environment.getAt(distance, name.lexeme) as LoxObject;
    } else {
      return this.globals.get(name);
    }
  }
}
