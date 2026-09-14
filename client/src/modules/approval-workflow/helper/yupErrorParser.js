export function parseYupErrors(err) {
  const bag = {};

  err.inner.forEach((e) => {
    const path = e.path
      .replace(/\[(\d+)\]/g, ".$1")
      .split(".");

    let ref = bag;
    path.forEach((key, i) => {
      if (i === path.length - 1) {
        ref[key] = e.message;
      } else {
        ref[key] ||= {};
        ref = ref[key];
      }
    });
  });

  return bag;
}
