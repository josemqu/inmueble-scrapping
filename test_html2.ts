export {};
const main = async () => {
  const req = await fetch("https://roblescasascampos.com/propiedades/catalogo", {
    headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      }
  });
  const res = await req.json();
  const sample = res.data[0];
  console.log("Slug:", sample.slug);
  
  const req2 = await fetch("https://roblescasascampos.com/propiedad/" + sample.slug);
  const html = await req2.text();
  console.log("Status:", req2.status);
  
  if (html.toLowerCase().includes("date") || html.toLowerCase().includes("created")) {
    console.log("Found date/created in HTML");
  } else {
    console.log("No date in html either.");
  }
};
main();
