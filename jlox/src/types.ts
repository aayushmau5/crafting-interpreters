import { Expr, Function, Return } from "./ast";
import { Environment } from "./environment";
import { Interpreter } from "./interpreter";

export type LoxObject = string | number | boolean | null | LoxCallable | Expr;

export abstract class LoxCallable {
  abstract call(interpreter: Interpreter, args: LoxObject[]): LoxObject;
  abstract arity(): number;
}

export class LoxFunction extends LoxCallable {
  static Return = class Return {
    constructor(public value: LoxObject) {}
  };

  declaration: Function;
  closure: Environment;
  constructor(declaration: Function, closure: Environment) {
    super();
    this.declaration = declaration;
    this.closure = closure;
  }

  call(interpreter: Interpreter, args: LoxObject[]): LoxObject {
    const environment = new Environment(this.closure);
    for (let i = 0; i < this.declaration.params.length; i++) {
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }
    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (returnValue: unknown) {
      return (returnValue as Return).value;
    }
    return null;
  }

  arity() {
    return this.declaration.params.length;
  }

  toString() {
    return `<fn ${this.declaration.name.lexeme}>`;
  }
}
