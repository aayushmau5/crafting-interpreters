/*
making environments that stores bindings.

"The bindings that associate variables to values need to be stored in an environment"

Map of key-value pair.
*/

import { RuntimeError } from "./errors";
import { Token } from "./token";
import { LoxObject } from "./types";

export class Environment {
  enclosing: Environment | null; // each environment has a reference to its enclosing environment
  values: Map<string, LoxObject> = new Map();

  constructor(enclosing?: Environment) {
    // enclosing = undefined is for global scope's environment
    this.enclosing = enclosing || null;
  }

  get(name: Token): LoxObject {
    if (this.values.has(name.lexeme)) {
      return this.values.get(name.lexeme) as LoxObject;
    }

    if (this.enclosing !== null) return this.enclosing.get(name);

    throw new RuntimeError(name, `Undefined variable ${name.lexeme}.`);
  }

  getAt(distance: number, name: string) {
    return this.ancestor(distance).values.get(name);
  }

  assignAt(distance: number, name: Token, value: LoxObject) {
    this.ancestor(distance).values.set(name.lexeme, value);
  }

  define(name: string, value: LoxObject): void {
    this.values.set(name, value);
  }

  assign(name: Token, value: LoxObject) {
    if (this.values.has(name.lexeme)) {
      this.values.set(name.lexeme, value);
      return;
    }

    if (this.enclosing !== null) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new RuntimeError(name, `Undefined variable ${name.lexeme}`);
  }

  ancestor(distance: number): Environment {
    let environment = this as Environment;
    for (let i = 0; i < distance; i++) {
      environment = environment.enclosing as Environment;
    }

    return environment;
  }
}
