// exportFirestore.js
import fs from "fs";
import admin from "firebase-admin";

// 🧾 Ruta a tu archivo de clave privada (ajustá si es necesario)
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

// 🚀 Inicializa Firebase con tu ID de proyecto
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://tfi-activa.firebaseio.com",
});

const db = admin.firestore();

// 📦 Función para exportar todas las colecciones
async function exportAllCollections() {
  const collections = await db.listCollections();
  for (const collection of collections) {
    console.log(`📤 Exportando colección: ${collection.id}`);
    const snapshot = await collection.get();

    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Guarda cada colección como archivo JSON
    fs.writeFileSync(`${collection.id}.json`, JSON.stringify(docs, null, 2));
    console.log(`✅ Colección "${collection.id}" exportada (${docs.length} documentos)`);
  }
  console.log("🎉 Exportación completa.");
}

exportAllCollections().catch(console.error);
