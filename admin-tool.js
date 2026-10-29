// admin-tool.js
const {initializeApp, cert} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
    credential: cert(serviceAccount),
});

async function listUsers() {
    try {
        const result = await getAuth().listUsers(10);

        result.users.forEach((u) => {
//      console.log(
//        `${u.email ?? "(no email)"} - Admin: ${u.customClaims?.admin === true}`
//      );
//      console.log(
//        u.customClaims
//      );
//      console.log(
//        `${u.customClaims}`
//      );
            console.log(
                u
            );
        });
        console.log()
        console.log("=============================================")
        console.log()
        result.users.forEach((u) => {
            console.log(
                JSON.stringify(u,null,8)
            );
        });
    } catch (error) {
        console.error("Failed to list users:", error);
        process.exitCode = 1;
    }
}

listUsers();

