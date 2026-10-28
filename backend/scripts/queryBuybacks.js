#!/usr/bin/env node

const { queryBuybacks } = require("../services/szseBuybackService");

const [company, from, to, page = "1", pageSize = "20"] =
  process.argv.slice(2);

if (!company) {
  console.error(
    "Usage: node scripts/queryBuybacks.js <company> [from] [to] [page] [pageSize]",
  );
  process.exit(1);
}

queryBuybacks({ company, from, to, page, pageSize })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
