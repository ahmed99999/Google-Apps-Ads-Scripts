

select *
from `biddy-io.peak_ace_active_clients_transfer.Criteria_1036246249` as criteria
where true
	and AdGroupId in (
	select
		AdGroupId
	from `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
	where true
		and adgroup.ExternalCustomerId = 1645187874
    and _DATA_DATE = _LATEST_DATE
		and CampaignId = 992696370
		--and CampaignState 
)
  and _DATA_DATE = _LATEST_DATE
	and criteria.ExternalCustomerId = 1645187874
	--and state = 1
	and criteria.IsNegative
  and criteria.Criteria = 'note 8'
  
  
  
  

select *
from `biddy-io.peak_ace_active_clients_transfer.Criteria_1036246249` as criteria
where true
	and AdGroupId in (
	select
		AdGroupId
	from `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
	where true
		and adgroup.ExternalCustomerId = 1645187874
    and _DATA_DATE = _LATEST_DATE
		and CampaignId = 992696370
		--and CampaignState 
)
  and _DATA_DATE = _LATEST_DATE
	and criteria.ExternalCustomerId = 1645187874
	--and state = 1
	and criteria.IsNegative



SELECT
  *
FROM `biddy-io.biddy.pitfall_data2`
WHERE TRUE
  and _PARTITIONDATE = CURRENT_DATE()
  and pitfall = LOWER( 'REPLACEABLE_NEGATIVE_KEYWORDS' )
  and account_id = '1645187874'
  AND campaign_status = 'ENABLED'
  

  
select *
from criteria
where true
	and adgroup_id in (
	select
		adgroup_id
	from adgroup
	where true
		and account_id = 1645187874
		and campaign_id = 992696370
		and state != -1
)
	and account_id = 1645187874
	--and state = 1
	--and is_negative
	
	
	




