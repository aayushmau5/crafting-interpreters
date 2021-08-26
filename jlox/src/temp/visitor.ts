/*
The Visitor pattern

Approximating the functional style within an OOP langauge.

We can define all of the behavior for a new operation on a set of types in one place,
without having to touch the types themselves.

A layer of indirection
*/

interface PastryVisitor {
  visitBeignet(beignet: Beignet): void;
  visitCruller(Cruller: Cruller): void;
}

interface Pastry {
  accept(visitor: PastryVisitor): void;
}

class Beignet implements Pastry {
  accept(visitor: PastryVisitor) {
    visitor.visitBeignet(this);
  }
}

class Cruller implements Pastry {
  accept(visitor: PastryVisitor) {
    visitor.visitCruller(this);
  }
}
