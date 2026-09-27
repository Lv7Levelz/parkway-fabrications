const $=(selector,parent=document)=>parent.querySelector(selector),$$=(selector,parent=document)=>[...parent.querySelectorAll(selector)];
const menu=$('.menu'),nav=$('.navlinks');
if(menu&&nav){menu.setAttribute('aria-expanded','false');menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});$$('.navlinks a').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}));}
const year=$('[data-year]');if(year)year.textContent=new Date().getFullYear();

const form=$('#quote-form');
if(form){
  const apiBase=(window.PARKWAY_CONFIG?.apiBase||'').replace(/\/$/,'');
  const requested=new URLSearchParams(location.search).get('service'),service=$('[name="service"]',form);
  if(requested&&service){const option=[...service.options].find(item=>item.text.toLowerCase()===requested.toLowerCase());if(option)service.value=option.value;}
  const status=$('.form-status',form),button=$('button[type="submit"]',form),files=$('[name="drawings"]',form);
  const showError=(message)=>{status.textContent=message;status.classList.remove('success');};
  const validateFiles=()=>{const selected=[...files.files],total=selected.reduce((sum,file)=>sum+file.size,0);if(selected.length>10)return 'Choose no more than 10 files.';if(selected.some(file=>file.size>10*1024*1024))return 'Each file must be 10 MB or smaller.';if(total>25*1024*1024)return 'The combined file size must be 25 MB or smaller.';return '';};
  files.addEventListener('change',()=>showError(validateFiles()));
  fetch(`${apiBase}/api/public-config`,{headers:{Accept:'application/json'}}).then(response=>response.ok?response.json():Promise.reject()).then(config=>{
    const whatsapp=$('#whatsapp-contact');if(whatsapp&&config.whatsappUrl){whatsapp.href=config.whatsappUrl;whatsapp.hidden=false;whatsapp.setAttribute('aria-label','Message Parkway Fabrications on WhatsApp');}
    if(config.turnstileSiteKey){const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js';script.async=true;script.defer=true;script.onload=()=>window.turnstile?.render('#turnstile-container',{sitekey:config.turnstileSiteKey});document.head.append(script);}
  }).catch(()=>{});
  form.addEventListener('submit',async event=>{
    event.preventDefault();showError('');const fileError=validateFiles();if(fileError)return showError(fileError);
    button.disabled=true;button.textContent='Sending securely…';
    try{
      const response=await fetch(`${apiBase}/api/enquiries`,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}}),data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'The enquiry could not be sent. Please try again.');
      if(!data.reference)throw new Error('The enquiry could not be confirmed. Please contact Parkway.');form.reset();status.textContent=`Thank you. Your enquiry reference is ${data.reference}. Keep this for your records.`;status.classList.add('success');button.disabled=false;button.textContent='Send Enquiry →';window.turnstile?.reset();
    }catch(error){showError(error.message||'The enquiry could not be sent. Please try again.');button.disabled=false;button.textContent='Send Enquiry →';window.turnstile?.reset();}
  });
}

