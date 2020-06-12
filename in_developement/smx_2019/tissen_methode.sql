SELECT
  Word1,
  Count(*) AS Count
FROM
(
  SELECT
    SPLIT( keyword.Criteria, ' ' ) as Word
  FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` keyword
  JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` campaign 
    USING ( ExternalCustomerId, CampaignId )
  WHERE true
    AND keyword.ExternalCustomerId = 7056468392
    AND REGEXP_CONTAINS( UPPER( campaign.CampaignName ), 'BRD|BRAND' )
    AND keyword._DATA_DATE = keyword._LATEST_DATE
    AND campaign._DATA_DATE = campaign._LATEST_DATE
    AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
    AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
),
UNNEST( Word ) AS Word1
GROUP BY
  Word1
ORDER BY
  Count DESC