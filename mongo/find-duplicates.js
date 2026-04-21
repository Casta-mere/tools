/**
 * find-duplicates.js — Find Users with duplicate phoneNumber or email.
 * Usage: node find-duplicates.js [--prod]
 */
const { getDb, disconnect } = require("./index");

async function findDuplicates() {
  const col = (await getDb("companyDB")).collection("Users");

  const [phoneGroups, emailGroups] = await Promise.all([
    col
      .aggregate([
        { $match: { phoneNumber: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$phoneNumber",
            count: { $sum: 1 },
            users: {
              $push: {
                uid: "$_id",
                email: "$email",
                displayName: "$displayName",
              },
            },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    col
      .aggregate([
        { $match: { email: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$email",
            count: { $sum: 1 },
            users: {
              $push: {
                uid: "$_id",
                phone: "$phoneNumber",
                displayName: "$displayName",
              },
            },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
  ]);

  return { phoneGroups, emailGroups };
}

if (require.main === module) {
  findDuplicates()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    })
    .finally(() => disconnect().then(() => process.exit(0)));
}

module.exports = { findDuplicates };
