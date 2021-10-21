import { Expr, Function, Return } from "./ast";
import { Environment } from "./environment";
import { RuntimeError } from "./errors";
import { Interpreter } from "./interpreter";
import { Token } from "./token";

export type LoxObject =
  | string
  | number
  | boolean
  | null
  | LoxCallable
  | Expr
  | LoxClass
  | LoxInstance;

export abstract class LoxCallable {
  abstract call(interpreter: Interpreter, args: LoxObject[]): LoxObject;
  abstract arity(): number;
}

export class LoxFunction extends LoxCallable {
  private isInitializer: boolean;

  static Return = class Return {
    constructor(public value: LoxObject) {}
  };

  declaration: Function;
  closure: Environment;
  constructor(
    declaration: Function,
    closure: Environment,
    isInitializer: boolean = false
  ) {
    super();
    this.isInitializer = isInitializer;
    this.declaration = declaration;
    this.closure = closure;
  }

  call(interpreter: Interpreter, args: LoxObject[]): LoxObject {
    const environment = new Environment(this.closure); // the enclosing environment of the function
    for (let i = 0; i < this.declaration.params.length; i++) {
      // defining each parameters in the enclsoing environment
      environment.define(this.declaration.params[i].lexeme, args[i]);
    }
    try {
      interpreter.executeBlock(this.declaration.body, environment);
    } catch (returnValue: unknown) {
      // we are allowing an empty return statement, `return;`, which will return the instance itself.
      if (this.isInitializer) return this.closure.getAt(0, "this")!;
      return (returnValue as Return).value;
    }

    if (this.isInitializer) {
      // if the function is an intilizer(ex. something.init()), then we returnt the instance itself(`this`).
      return this.closure.getAt(0, "this")!;
    }

    return null;
  }

  arity() {
    return this.declaration.params.length;
  }

  toString() {
    return `<fn ${this.declaration.name.lexeme}>`;
  }

  bind(instance: LoxInstance) {
    const environment = new Environment(this.closure); // creates a new environemt whose parent is the enclosing function closure
    environment.define("this", instance); // defines `this` in this new enviroment. Binds it to the instance that the method is being accessed from.
    return new LoxFunction(this.declaration, environment, this.isInitializer);
  }
}

export class LoxClass extends LoxCallable {
  name: string;
  methods: Map<string, LoxFunction>;
  superclass: LoxClass;

  constructor(
    name: string,
    superclass: LoxClass,
    methods: Map<string, LoxFunction>
  ) {
    super();
    this.name = name;
    this.methods = methods;
    this.superclass = superclass;
  }

  call(interpreter: Interpreter, args: LoxObject[]) {
    // creates a new instance of the class
    const instance = new LoxInstance(this);

    // finds the initializer.(We are using `init` function as our constructor).
    const initializer = this.findMethod("init");
    if (initializer !== null && initializer !== undefined) {
      initializer.bind(instance).call(interpreter, args);
    }

    return instance;
  }

  arity() {
    const initializer = this.findMethod("init");
    if (initializer === null || initializer === undefined) return 0; // if there is not constructor, the no. of args it takes is 0.
    return initializer.arity();
  }

  toString() {
    return this.name;
  }

  findMethod(name: string): LoxFunction | null {
    if (this.methods.has(name)) {
      return this.methods.get(name)!;
    }

    if (this.superclass !== null) {
      return this.superclass.findMethod(name);
    }

    return null;
  }
}

export class LoxInstance {
  private klass: LoxClass;
  private fields: Record<string, LoxObject> = {}; // stores the fields present in an object

  constructor(klass: LoxClass) {
    this.klass = klass;
  }

  get(name: Token) {
    // get a property from the object

    if (name.lexeme in this.fields) {
      // get a field
      return this.fields[name.lexeme];
    }

    // get a method
    const method = this.klass.findMethod(name.lexeme);
    if (method !== null && method !== undefined) return method.bind(this);

    throw new RuntimeError(name, `Undefined property name ${name.lexeme}.`);
  }

  set(name: Token, value: LoxObject) {
    // set a property in the object
    this.fields[name.lexeme] = value;
  }

  toString() {
    return this.klass + "instance";
  }
}
