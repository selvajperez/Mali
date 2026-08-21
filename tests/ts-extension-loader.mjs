// Permite que los imports relativos sin extensión de src/ (escritos para el
// bundler de Astro) resuelvan a su archivo .ts cuando corren bajo node --test.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw err;
  }
}
