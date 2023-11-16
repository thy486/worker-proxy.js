export interface IClassDefineOptions<S, I, C> {
    static?: S;
    instance?: I;
    construct?: C;
}

export interface IClassDefineRequiredOptions<S, I, C> {
    static: S;
    instance: I;
    construct: C;
}
