/**
 * Convert a Mongoose lean document (with ObjectId / Date instances) into a
 * plain, JSON-safe object suitable for passing from Server Components to
 * Client Components. ObjectIds → hex strings, Dates → ISO strings.
 */
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
