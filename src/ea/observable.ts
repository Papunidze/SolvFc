import type { EAObservable } from './globals'

export function toPromise<T>(observable: EAObservable<T>) {
  return new Promise<T>((resolve) => observable.observe(undefined, (_sender, response) => resolve(response)))
}
