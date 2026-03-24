export {};
const main = async () => {
  const req = await fetch("https://roblescasascampos.com/propiedades/catalogo", {
    headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      }
  });
  const res = await req.json();
  if (res.data.length > 0) {
     const sample = res.data[0];
     console.log("All keys:", Object.keys(sample));
     // Log the potential temporal or status keys
     for (const k of ["id", "is_starred_on_web", "tags", "custom_tags"]) {
       console.log(k, sample[k]);
     }
  }
};
main();
