/* Explicit status labels sort after ordinary records, regardless of sort direction. */
window.HMItemStatus = {
  isUncertain(item) {
    const fields=['title','shop','location','level','availability','status','data_status','ride','jump','command','care','speed','strength','agility','discipline','endurance','sc','js'];
    return fields.some(key=>typeof item?.[key]==='string' && /\b(?:not verified|unknown|not available|unavailable)\b/i.test(item[key]));
  },
  isReward(item) {
    return /\b(?:rewards?|gifts?|quest reward|redeem code|present)\b/i.test(String(item?.shop||item?.location||''));
  },
  rank(item) {return this.isUncertain(item)?2:this.isReward(item)?1:0;},
  compare(a,b) {return this.rank(a)-this.rank(b);}
};
