function main() {  
  
    var query = 'SELECT Id, CampaignId, Criteria, KeywordMatchType, AdGroupId '
         + 'FROM KEYWORDS_PERFORMANCE_REPORT '
         + 'WHERE KeywordMatchType = "BROAD" '
            + 'AND IsNegative = "FALSE" ' 
            + 'AND CampaignStatus = "ENABLED" ' 
         + 'AND AdGroupStatus = "ENABLED" ' 
         + 'AND Status = "ENABLED" ' 
     ;
   
   AdWordsApp.createLabel('delete');
   
   var s = AdWordsApp.report(query).rows();
   
   var map = {};
   while(s.hasNext()){
         var item = s.next();
         map[ item[ 'AdGroupId' ] ] = map[ item[ 'AdGroupId' ] ] || [];
         map[ item[ 'AdGroupId' ] ].push( item );
     
    }
   var matrix = [];
   for( adgroupId in map ){
     var keywords = map[ adgroupId ];
     
     for(var i =0;i<keywords.length;i++){
           var crit = keywords[i].Criteria.split("+");
           //Logger.log(keywords[i].AdGroupId +'  ==>' + keywords[i].Id);
           crit.shift();
           crit.unshift( keywords[i].Id);
         crit.unshift( keywords[i].AdGroupId);
           matrix[i] = crit;
 
     }  
           Logger.log('======================================================>>>');
 
   for (var j=0 ; j<matrix.length;j++){
    for (var i=0 ; i<matrix[j].length;i++){
         matrix[j][i] = matrix[j][i].replace(/\s/g, "");
          //Logger.log(matrix[j][i]);
    }
       
   }
 
   for (var i=0 ; i <matrix.length ;i++){   
     
       for(var j=0 ; j < matrix.length ; j++){
       
       var k = 2 ;      
       var notTest = false;
       
       if (i != j && matrix[j][matrix[j].length - 1] != 'delete'){
         while(k <matrix[i].length && notTest == false){
           
             var test = matrix[i][k] ;
             if(matrix[j].indexOf(test) < 0){
               notTest = true ;
             }
             k++;                    
         } 
         
         if (notTest == false){
               matrix[j].push('delete');      
         }  
       }
     }
     
     
   }
   
   
   Logger.log('=========================================');
   
    for (var j=0 ; j<matrix.length;j++){
         Logger.log(matrix[j]);
      if ( matrix[j][matrix[j].length - 1] == 'delete'){
        
            var keyww = AdWordsApp.keywords().withCondition('Id = '+matrix[j][1]).withCondition('AdGroupId = '+matrix[j][0]).get();
                keyww.next().applyLabel('delete');       
       }
                
        
   }
 
     
   } 
     
 }    
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 