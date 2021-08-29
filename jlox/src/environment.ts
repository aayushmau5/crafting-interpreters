/*
making environments that stores bindings.

"The bindings that associate variables to values need to be stored in an environment"

Map of key-value pair.
*/

import { RuntimeError } from "./errors";
import { Token } from "./token";
import { LoxObject } from "./types";

export class Environment {
  value: Map<string, LoxObject> = new Map();

  get(name: Token): LoxObject {
    if (this.value.has(name.lexeme)) {
      return this.value.get(name.lexeme) as LoxObject;
    }

    throw new RuntimeError(name, `Undefined variable ${name.lexeme}.`);
  }

  define(name: string, value: LoxObject): void {
    this.value.set(name, value);
  }
}
