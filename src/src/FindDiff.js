export default function findDiff(oldText,newText1){
        let start=0;
        while(start<oldText.length &&start<newText1.length && oldText[start]===newText1[start]){
            start++;
        }
        let oldend=oldText.length-1;
        let newend=newText1.length-1;
        while(newend>=start&&oldend>=start&&  oldText[oldend]===newText1[newend]){
            oldend--;
            newend--;
        }
        let delete_count=oldend-start+1
        let newText=newText1.substring(start,newend+1)
        return{
            newText,
            start,
            delete_count,
        }
    }