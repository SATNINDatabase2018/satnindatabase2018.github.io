/* Explicit status labels sort after ordinary records, regardless of sort direction. */
window.HMItemStatus = {
  isUncertain(item) {
    const fields=['title','shop','location','level','availability','status','data_status','ride','jump','command','care','speed','strength','agility','discipline','endurance','sc','js'];
    return fields.some(key=>typeof item?.[key]==='string' && /\b(?:not verified|unknown|not available|unavailable)\b/i.test(item[key]));
  },
  compare(a,b) {return Number(this.isUncertain(a))-Number(this.isUncertain(b));}
};
