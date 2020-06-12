var doc = SpreadsheetApp.getActiveSpreadsheet();
var s_admin = doc.getSheetByName("Admin");
var s_sites = doc.getSheetByName("Sites");
var s_searchAnalytics = doc.getSheetByName("Search Analytics");
var s_crawlSamples = doc.getSheetByName("Crawl Samples");
var s_crawlSampleByUrl = doc.getSheetByName("Crawl Samples by URL");
var site_name = "https://print24.com/";

var CLIENT_ID = '1036644356409-226k7h47j90o6rp8qrg04gurjcg195of.apps.googleusercontent.com';
var CLIENT_SECRET = 'Ibz5LAvswTugvS7gqNPk5x3U';

// add menu
function onOpen() {
  var menu = SpreadsheetApp.getUi();
  menu.createMenu("Search Console")
  .addItem("List Account Sites", 'listAccountSites')
  .addSubMenu(menu.createMenu('Search Analytics')
              .addItem("Get Search Analytics data", 'getSearchAnalytics')
              .addItem("Define brand queries", "defineBrand")
              )
  .addSubMenu(menu.createMenu('Crawl Errors')
              .addItem("List Crawl Errors", 'listCrawlErrors')
              .addItem("Get Crawl Errors Details", 'getCrawlErrorsDetails')
              .addItem("Check Links Presense", 'checkLinks')
              .addItem("Mark as Fixed", 'markAsFixed')
              )
  .addToUi();
  var service = getService();
  if (!service.hasAccess()) {
    Browser.msgBox('Welcome to Search Console script! You should authorise. Run from menu: Search Console -> List Account Sites', Browser.Buttons.OK);
  }else{Browser.msgBox('Welcome to Search Console script!');}
}
//---------------------------------------------------------------------------------------------------------------------------------------------



