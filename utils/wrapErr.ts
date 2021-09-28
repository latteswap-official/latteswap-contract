import { Either, left, right } from "fp-ts/lib/Either";

export async function wrapErr<T>(p: Promise<T>): Promise<Either<any, T | undefined>> {
  try {
    const result = await p;
    return right(result);
  } catch (err) {
    return left(err);
  }
}
