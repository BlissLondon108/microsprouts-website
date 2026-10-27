(()=>{"use strict";
const status=document.getElementById("portal-status"),link=document.getElementById("portal-link");
(async()=>{
 try{
  const response=await fetch("/api/checkout/portal",{cache:"no-store"});
  const result=await response.json();
  if(!response.ok||typeof result.url!=="string"||!result.url.startsWith("https://billing.stripe.com/p/login/")){
   throw Error(result.error||"The Stripe portal isn't ready yet.");
  }
  link.href=result.url;
  link.hidden=false;
  status.textContent="The secure customer portal is ready. Stripe will send a sign-in link to your subscription email.";
 }catch(error){
  status.textContent=error.message||"The Stripe customer portal is currently unavailable.";
 }
})();
})();