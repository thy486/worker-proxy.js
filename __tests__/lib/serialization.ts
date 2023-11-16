export class Foo<T> {
    private readonly value: T;
  
    constructor(value: T) {
        this.value = value;
    }
  
    getValue() {
        return this.value;
    }
}

export class Bar<T> {
    private readonly value = new Foo('bar');
    private car: Car<T> | undefined;
  
    getFoo() {
        return this.value;
    }

    getCar() {
        return this.car;
    }

    setCar(car: Car<T>) {
        this.car = car;
    }
}

export class Car<T> {
    private readonly value: Bar<T> = new Bar();

    public constructor() {
        this.value.setCar(this);
    }
  
    getBar() {
        return this.value;
    }
}
  