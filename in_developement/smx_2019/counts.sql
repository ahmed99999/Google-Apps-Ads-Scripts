-- counts
WITH
missingKeywords AS (
  SELECT
    AccountName,
    Date,
    COUNT(*) AS CountUniqueMissingKeywords
  FROM (
    SELECT
      AccountName,
      Query,
      Date
    FROM
      `biddy-io.regression.missing_keywords`
    GROUP BY
      AccountName,
      Query,
      Date
  )
  GROUP BY
    AccountName,
    Date
),


misroutingQueries AS (
  SELECT
    AccountName,
    Date,
    COUNT(*) AS CountUniqueMisroutingQueries
  FROM (
    SELECT
      AccountName,
      Query,
      Date
    FROM
      `biddy-io.regression.misrouting_queries`
    GROUP BY
      AccountName,
      Query,
      Date
  )
  GROUP BY
    AccountName,
    Date
),


pausedKeywords AS (
  SELECT
    AccountName,
    Date,
    COUNT(*) AS CountUniquePausedKeywords
  FROM (
    SELECT
      AccountName,
      Query,
      Date
    FROM
      `biddy-io.regression.paused_keywords` 
    GROUP BY
      AccountName,
      Query,
      Date
  )
  GROUP BY
    AccountName,
    Date
)
,


shoppingMissingKeywords AS (
  SELECT
    AccountName,
    Date,
    COUNT(*) AS CountUniqueShoppingMissingKeywords
  FROM (
    SELECT
      AccountName,
      Query,
      Date
    FROM
      `biddy-io.regression.shopping_missing_keywords` 
    GROUP BY
      AccountName,
      Query,
      Date
  )
  GROUP BY
    AccountName,
    Date
)
,


dsaMissingKeywords AS (
  SELECT
    AccountName,
    Date,
    COUNT(*) AS CountUniqueDsaMissingKeywords
  FROM (
    SELECT
      AccountName,
      Query,
      Date
    FROM
      `biddy-io.regression.dsa_missing_keywords`
    GROUP BY
      AccountName,
      Query,
      Date
  )
  GROUP BY
    AccountName,
    Date
)

SELECT
  AccountName,
  Date,
  CountUniqueMissingKeywords,
  CountUniqueMisroutingQueries,
  CountUniquePausedKeywords,
  CountUniqueShoppingMissingKeywords,
  CountUniqueDsaMissingKeywords
FROM
  missingKeywords
LEFT JOIN misroutingQueries
  USING( AccountName, Date )
LEFT JOIN pausedKeywords
  USING( AccountName, Date )
LEFT JOIN shoppingMissingKeywords
  USING( AccountName, Date )
LEFT JOIN dsaMissingKeywords
  USING( AccountName, Date )
ORDER BY
  AccountName,
  Date

