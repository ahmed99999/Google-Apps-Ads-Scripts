SELECT
  TO_BASE64(
    CODE_POINTS_TO_BYTES(
      TO_CODE_POINTS(
        id
      )
    )
  ) as base64,
  id
FROM
(
  SELECT
    CASE
      WHEN SPLIT( route_type, '.' )[OFFSET(0)] = 'II' -- to
        THEN
          CONCAT(
            CASE WHEN vertical_presence = 'with_vertical'
              THEN 'mode_to_position_page'
              ELSE 'to_location_page'
            END,
            '.',
            LOWER( domain ), -- domain or language?
            CASE WHEN vertical_presence = 'with_vertical'
              THEN CONCAT( '.', LOWER( travel_mode ) )
              ELSE ''
            END,
            '.',
            CAST( arrival_position_id AS STRING )
          )
        ELSE -- from-to
          CONCAT(
            CASE WHEN vertical_presence = 'with_vertical'
              THEN 'connection_page'
              ELSE 'connection_page_nt'
            END,
            '.',
            LOWER( domain ), -- domain or language?
            CASE WHEN vertical_presence = 'with_vertical'
              THEN CONCAT( '.', LOWER( travel_mode ) )
              ELSE ''
            END,
            '.',
            CAST( departure_position_id AS STRING ),
            '.',
            CAST( arrival_position_id AS STRING )
          )
    END as id
  FROM ( SELECT 'I.0' as route_type
    UNION ALL SELECT '0.0'
    UNION ALL SELECT 'II.0'
  )
  JOIN ( SELECT 380324 as departure_position_id ) ON TRUE
  JOIN ( SELECT 380324 as arrival_position_id ) ON TRUE
  JOIN ( SELECT 'DE' as domain UNION ALL SELECT 'FR' UNION ALL SELECT 'PL' UNION ALL SELECT 'IT' UNION ALL SELECT 'AR' ) ON TRUE
  JOIN ( SELECT 'Train' AS travel_mode UNION ALL SELECT 'Bus' ) ON TRUE
  JOIN ( SELECT 'with_vertical' AS vertical_presence UNION ALL SELECT 'without_vertical' ) AS vertical_presence1 ON TRUE
)