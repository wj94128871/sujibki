Project=function(){

    var pno;
    var _This=this;
    var searchString='';
    //var flowInterval;
    var interval;
    var errorGap=0;

    var anyView=0;
    var i =0;



    //clearInterval(_This.interval);
    //_This.interval=setInterval(_This.fstFlowTime,1000);

    this.getPno=function(){return _This.pno;}
    this.setPno=function(pno){_This.pno=pno;}
    this.getAnyView=function(){return _This.anyView;}
    this.setAnyView=function(anyView){_This.anyView=anyView;}

    _This.flowTime=function(){
        var thisTime=(new Date()).getTime()/1000+_This.errorGap;

        $(".timeView").each(function(){
            var endtime=$(this).attr("data-endtime");
            var edate = $(this).attr("data-edate");


            var nowtime = moment();
            nowtime = nowtime.format('YYYY-MM-DD HH:mm:ss');
            var finishtime = moment(edate+' 23:59:59','YYYY-MM-DD HH:mm:ss');
            var finishtday = moment(edate+' 00:00:00','YYYY-MM-DD HH:mm:ss');
            finishtime =  finishtime.format('YYYY-MM-DD HH:mm:ss');
            var gapTime =moment(finishtday).diff(moment(nowtime));
            var gapday = moment(finishtday).diff(moment(nowtime),'days');


            gapTime = gapTime/1000;
            var nTotalMin = parseInt(gapTime / 60);
            var nHour = parseInt(nTotalMin / 60);
            var nMin = nTotalMin % 60;
            var nSec = gapTime % 60;



            var timeNumber='';
            var timeUnit='';
 
            var pno=$(this).attr("data-pno");
            var modeClass="bg01 ylw";
            var modeKo="";
            var dday = "";
            if (gapTime<=0){
                timeNumber='마감';
                timeUnit='';
        
                $(this).removeClass("timeView");

                $(".projectTitle[data-pno='"+pno+"']").removeClass("bg");

                modeClass="finish brw";
                modeKo="마감";
            }
            else if (gapTime<=86400){
                if (gapTime<=120){
                    timeNumber=nSec;
                    timeUnit='초 남음';
                    dday = "D-DAY";
      
                }
                else if (gapTime<=7200){
                    timeNumber=( (nMin < 10) ? "0" : "" ) + nMin + "분 " + ( (nSec < 10) ? "0" : "" ) + nSec+"초";
                    timeUnit=' 남음';
                    dday = "D-DAY";
                }
                else{
                    timeNumber=( (nHour < 10) ? "0" : "" ) + nHour + "시간 " + ( (nMin < 10) ? "0" : "" ) + nMin + "분 " + ( (nSec < 10) ? "0" : "" ) + nSec+"초";
                    timeUnit='남음';
                    dday = "D-DAY";
                }
                modeClass="impend org";
                //modeKo="마감임박";
                modeKo="마감:"+dday;
            }
            else{
                if (gapTime<=172800){
                    timeNumber=((nHour < 10) ? "0" : "" ) + nHour + "시간 ";
                    timeUnit='남음';
                    dday = "D-DAY";
                }
                else{
                    timeNumber=gapday;
                    timeUnit='일 남음';
                    dday = "D-"+gapday+"일";
                }

                modeClass="bg01";
                modeKo="마감:"+dday;
            }

            $(this).find(".timeNumber").text(timeNumber);
            $(this).find(".timeUnit").text(timeUnit);

            $(".mozipMode[data-pno='"+pno+"']").text(modeKo)
                .removeClass("bg01").removeClass("finish").removeClass("impend").addClass(modeClass);

        });
    };

    interval=setInterval(_This.flowTime,1000);

    _This.DisplayTime=function(nMSec){
        var nTotalSec = parseInt(nMSec / 1000);

        var nTotalMin = parseInt(nTotalSec / 60);
        var nHour = parseInt(nTotalMin / 60);
        var nMin = nTotalMin % 60;
        var nSec = nTotalSec % 60;
        return ( (nHour < 10) ? "0" : "" ) + nHour + "시간 " + ( (nMin < 10) ? "0" : "" ) + nMin + "분 " + "남음";
        //return ( (nHour < 10) ? "0" : "" ) + nHour + "시간 " + ( (nMin < 10) ? "0" : "" ) + nMin + "분 " + ( (nSec < 10) ? "0" : "" ) + nSec+"초 남음";
    }


    this.getConditionData=function(pagenum){
        var returnDATA={
            "sS":$("#projectSearchStringInput").val(),
            "page":pagenum
        };


        var location=[];
        var fld_cd=[];
        var during = [];
        var cost = [];
        var stay = [];
        var fnd2 = [];
        var st = [];
        var filteringRadio = [];

        if (SITE_URL_METHOD=='pc'){
            if(i != 0){


                $(".locCheck:checked").each(function(){
                    location.push($(this).val());
                });
                $(".filteringRadio:checked").each(function(){
                    if($(this).data("value") != 0){
                        filteringRadio.push($(this).data("value"));
                    }
                });
                $(".fnd2Check:checked").each(function(){
                    fnd2.push($(this).val());
                });
				 returnDATA['f']=filteringRadio;
				 returnDATA['sm']=$(".sortingRadio.on").attr("data-sorting-mode");
				 returnDATA['mp']=$("#myProjectCheck.on").length;
                 returnDATA['lp']=$("#myLikeCheck.on").length;
				//  returnDATA['duringMin']=$(".duringRadio.on").attr("data-during-min");
				//  returnDATA['duringMax']=$(".duringRadio.on").attr("data-during-max");
				//  returnDATA['costMin']=$(".costRadio.on").attr("data-cost-min");
				//  returnDATA['costMax']=$(".costRadio.on").attr("data-cost-max");
				 returnDATA['loc'] = location;
                 returnDATA['fnd2'] = fnd2;
                 returnDATA['st']=$(".stayRadio.on").attr("data-stay-value");
                 returnDATA['st2']='';
                 returnDATA['st3']='';
                 
                 
                 if(returnDATA['st'] == "stayExcept"){
                     if($("#type-chk01").is(":checked")===true && $("#type-chk02").is(":checked")===true){
                         returnDATA['st2'] = '2';
                     }else if($("#type-chk01").is(":checked")===true){
                         returnDATA['st2'] = '0';
                     }else if($("#type-chk02").is(":checked")===true){
                         returnDATA['st2'] = '1';
                     }
                     
                 }
                 if(returnDATA['st'] == "stayView"){
                     if($("#range-chk01").is(":checked")===true && $("#range-chk02").is(":checked")===true){
                         returnDATA['st3'] = '2';
                     }else if($("#range-chk01").is(":checked")===true){
                         returnDATA['st3'] = '0';
                     }else if($("#range-chk02").is(":checked")===true){
                         returnDATA['st3'] = '1';
                     }
                     
                 }

            }else{
                if($.cookie('prj_filter_check') == 'check' && $('#sdnofasdbniobnasdiovbioasddsfsdbvioasdbviobasiofbos').val() != ''){
                   
                    var prj_filter_part = $.cookie('prj_filter_part');
                    var prj_filter_during = ($.cookie('prj_filter_during')) ? $.cookie('prj_filter_during').split('-' ): '';
                    var prj_filter_cost = ($.cookie('prj_filter_cost')) ? $.cookie('prj_filter_cost').split('-' ): '';
                    var prj_filter_loc = ($.cookie('prj_filter_loc')) ? $.cookie('prj_filter_loc').split('-' ): '';
                    var prj_filter_fnd2 = ($.cookie('prj_filter_fnd2')) ? $.cookie('prj_filter_fnd2').split('-' ): '';
                    var prj_filter_stay = $.cookie('prj_filter_stay');
                    var prj_filter_stay2 = $.cookie('prj_filter_stay2');
                    var prj_filter_stay3 = $.cookie('prj_filter_stay3');
                    var prj_filter_sort = $.cookie('prj_filter_sort');
                    if(prj_filter_loc !='' ){
                        prj_filter_loc.splice(prj_filter_loc.indexOf(""),1);
                    }
               
                    if(prj_filter_fnd2 !=''){
                        prj_filter_fnd2.splice(prj_filter_fnd2.indexOf(""),1);
                    }
               
                    if(prj_filter_part){
                        returnDATA['f']=prj_filter_part;
                    }

                    // if('<?php $this->input->get("favi")?>'!=''){
                    //     returnDATA['favi'] = '1';
                    // }
                    


                    if(prj_filter_sort !='' || prj_filter_sort !=null){
                        if(prj_filter_sort == '0'){
                            $(".sortingRadio").removeClass("on");
                            $(".sortingRadio").prop("checked",false);
                            $("#default_radio").addClass("on");
    
                        }else{
                            $(".default_radio").removeClass("on");
                            $(".default_radio").prop("checked",false);
                            $(".sortingRadio[data-sorting-mode="+prj_filter_sort+"]").addClass("on");
                            $(".sortingRadio[data-sorting-mode="+prj_filter_sort+"]").prop("checked",true);
                        }
                    }
                  
                    $(".stayRadio").removeClass("on");
                    $(".stayRadio").prop("checked",false);


                    switch(prj_filter_stay2){
                        case '2':
                            prj_filter_stay="stayExcept";
                            $("#type-chk01").prop("checked",true);
                            $("#type-chk02").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").addClass("on");
                            break;
                        case '0':
                            prj_filter_stay="stayExcept";
                            $("#type-chk01").prop("checked",true);
                            $("#type-chk02").prop("checked",false);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").addClass("on");
                            break;
                        case '1':
                            prj_filter_stay="stayExcept";
                            $("#type-chk01").prop("checked",false);
                            $("#type-chk02").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").addClass("on");
                            break;
                    }
                    switch(prj_filter_stay3){
                        case '2':
                            prj_filter_stay="stayView";
                            $("#range-chk01").prop("checked",true);
                            $("#range-chk02").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").addClass("on");
                            break;
                        case '0':
                            prj_filter_stay="stayView";
                            $("#range-chk01").prop("checked",true);
                            $("#range-chk02").prop("checked",false);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").addClass("on");
                            break;
                        case '1':
                            prj_filter_stay="stayView";
                            $("#range-chk01").prop("checked",false);
                            $("#range-chk02").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").prop("checked",true);
                            $(".stayRadio[data-stay-value="+prj_filter_stay+"]").addClass("on");
                            break;
                    }
                    returnDATA['sm']=prj_filter_sort;
                    returnDATA['mp']=$("#myProjectCheck.on").length;
                    returnDATA['lp']=$("#myLikeCheck.on").length;
                    // returnDATA['duringMin']=prj_filter_during[0].replace(/\s/gi, "");
                    // returnDATA['duringMax']=prj_filter_during[1].replace(/\s/gi, "");
                    // returnDATA['costMin']=prj_filter_cost[0].replace(/\s/gi, "");
                    // returnDATA['costMax']=prj_filter_cost[1].replace(/\s/gi, "");
                    returnDATA['loc'] = prj_filter_loc;
                    returnDATA['fnd2'] = prj_filter_fnd2;
                    returnDATA['st']=prj_filter_stay;
                    returnDATA['st2']=prj_filter_stay2;
                    returnDATA['st3']=prj_filter_stay3;


                    // if(returnDATA['st2'] == '2'){
                    //     $("#type-chk01").prop("checked",true);
                    //     $("#type-chk02").prop("checked",true); 
                    // }else if(returnDATA['st2'] == '0'){
                    //     $("#type-chk01").prop("checked",true);
                    //     $("#type-chk02").prop("checked",false); 
                    // }else if(returnDATA['st2'] == '1'){
                    //     $("#type-chk01").prop("checked",false); 
                    //     $("#type-chk02").prop("checked",true); 
                    // }
                   
                    // if(returnDATA['st3'] == '2'){
                    //     $("#range-chk01").prop("checked",true);
                    //     $("#range-chk02").prop("checked",true);    
                    // }else if(returnDATA['st3'] == '0'){
                    //     $("#range-chk01").prop("checked",true);
                    //     $("#range-chk02").prop("checked",false);    
                    // }else if(returnDATA['st3'] == '1'){
                    //     $("#range-chk01").prop("checked",false);
                    //     $("#range-chk02").prop("checked",true);    
                    // }


                    $(".filteringRadio").removeClass("on");
                  
                    if(prj_filter_part.length > 1){
                        prj_filter_part=prj_filter_part.split(",");
                        $.each(prj_filter_part,function( index,value ) {
                            $(".filteringRadio[data-value='"+value+"']").addClass("on");
                            $(".filteringRadio[data-value='"+value+"']").prop("checked",true);
                        });
                    }else{
                        $(".filteringRadio[data-value='"+prj_filter_part+"']").addClass("on");
                        $(".filteringRadio[data-value='"+prj_filter_part+"']").prop("checked",true);
                    }
                 
  

                    //     console.log(prj_filter_part[index],$(this).data('value'));
                    //     if($(this).data('value') == prj_filter_part[index]){
                    //         $(this).addClass("on");
                    //         $(this).prop("checked",true);
                    //     }
                    // });


                    // $(".duringRadio").removeClass("on");
                    // $( ".duringRadio" ).each(function( index ) {
                    //     if($( this ).data('duringMin') == prj_filter_during[0].replace(/\s/gi, "")){
                    //         if($( this ).data('duringMax') == prj_filter_during[1].replace(/\s/gi, "")){
                    //             $(this).addClass("on");
                    //         }
                    //     }
                    // });

                    // $(".costRadio").removeClass("on");
                    // $( ".costRadio" ).each(function( index ) {
                    //     if($( this ).data('costMin') == prj_filter_cost[0].replace(/\s/gi, "")){
                    //         if($( this ).data('costMax') == prj_filter_cost[1].replace(/\s/gi, "")){
                    //             $(this).addClass("on");
                    //         }
                    //     }
                    // });


                    $(".locCheck").removeClass("on");
                    $(prj_filter_loc).each(function( index ) {
                   	 	$( ".locCheck" ).each(function( parent ) {
                   	 		if($(this).val() == prj_filter_loc[index]){
                                $(this).addClass("on");
                                $(this).prop("checked",true);
                              
							}
                        })
                    });
                    if(prj_filter_loc != "" ){
                        $(".proj-filter-cont dl.toggle-type a").addClass("on");
                        $(".proj-filter-cont dl.toggle-type dd").show();
          
                    }

                    // $(".fnd2Check").removeClass("on");
                    // $(prj_filter_fnd2).each(function( index ) {
                    //     $( ".fnd2Check" ).each(function( parent ) {
                    //         if($(this).val() == prj_filter_fnd2[index]){
                    //             $(this).toggleClass('on');
                    //         }
                    //     })
                    // });


				}else{
                    var get_parent_fnd = [];
                    $(".filteringRadio:checked").each(function(){
          
                            get_parent_fnd.push($(this).data("value"));
          
                        
                    });
                     
                    if(get_parent_fnd != ''){
                        $('.speciality-low').addClass('on');
                        $(".fnd2_item").each(function(){
                            $(this).css('display','inline-block');
                            if(get_parent_fnd != $(this).data('parent-value')){
                                $(this).css('display','none');
                            }
                        });
                    }else{
                        $('.speciality-low').removeClass('on');
                    }

                    $(".locCheck:checked").each(function(){
                        location.push($(this).val());
                    });
                    $(".fnd2Check:checked").each(function(){
                        fnd2.push($(this).val());
                    });

                    returnDATA['f']=prj_filter_part;
                    returnDATA['sm']=$(".sortingRadio.on").attr("data-sorting-mode");
                    returnDATA['mp']=$("#myProjectCheck.on").length;
                    returnDATA['lp']=$("#myLikeCheck.on").length;
                    // returnDATA['duringMin']=$(".duringRadio.on").attr("data-during-min");
                    // returnDATA['duringMax']=$(".duringRadio.on").attr("data-during-max");
                    // returnDATA['costMin']=$(".costRadio.on").attr("data-cost-min");
                    // returnDATA['costMax']=$(".costRadio.on").attr("data-cost-max");
                    returnDATA['loc'] = location;
                    returnDATA['fnd2'] = fnd2;
                    returnDATA['st'] = $(".stayRadio.on").attr("data-stay-value");
                    returnDATA['st2']='';
                    returnDATA['st3']='';
                    if(returnDATA['st'] == "stayExcept"){
                        if($("#type-chk01").is(":checked")===true && $("#type-chk02").is(":checked")===true){
                            returnDATA['st2'] = '2';
                        }else if($("#type-chk01").is(":checked")===true){
                            returnDATA['st2'] = '0';
                        }else if($("#type-chk02").is(":checked")===true){
                            returnDATA['st2'] = '1';
                        }
                        
                    }
                    if(returnDATA['st'] == "stayView"){
                        if($("#range-chk01").is(":checked")===true && $("#range-chk02").is(":checked")===true){
                            returnDATA['st3'] = '2';
                        }else if($("#range-chk01").is(":checked")===true){
                            returnDATA['st3'] = '0';
                        }else if($("#range-chk02").is(":checked")===true){
                            returnDATA['st3'] = '1';
                        }
                        
                    }

                }

            }

        }
        if($("#favi").val()!=''){
            returnDATA['favi'] = '1';
        }

        i++;
        return returnDATA;
    }




    this.getList=function(pagenum){
        $("#projectListNew,#projectPagination").empty();

        if (!pagenum) pagenum=1;
        prs.aCall("/m4a/s41a",_This.getConditionData(pagenum),function(r){
            // console.log(r);

            var DATA=r.DATA;
            _This.errorGap=r.NOW-((new Date()).getTime()/1000);
            
            if(DATA.PROJECT.LIST.length==0){
                var _html ='';
                _html +='<div class="partnersConMsg" style="text-align: center;padding: 200px 0px; ">';
                if($("#favi").val()=='1'){
                    _html +='    <img src="/public/images/loadedFreelancerEmpty.png"  style="height: 140px; margin-bottom: 30px;">';
                    _html +='    <p style="width: 100%;font-size: 16px;color: #262626;margin-bottom: 10px;">리스트에서 관심 프로젝트를 등록해보세요.</p>';
                    _html +='    <p style="width: 100%;font-size: 16px;color: #262626;margin-bottom: 20px;">마이페이지에서 손쉽게 관리할 수 있습니다.</p>';
                }else{
                    _html +='    <img src="/public/images/emptyProjectRating.png"  style="height: 140px; margin-bottom: 30px;">';
                    _html +='    <p style="width: 100%;font-size: 16px;color: #262626;margin-bottom: 10px;">검색하신 키워드로 매칭되는 프로젝트가 없습니다.</p>';
                    _html +='    <p style="width: 100%;font-size: 16px;color: #262626;margin-bottom: 20px;">다른 키워드로 검색해보세요.</p>';
                }
                _html +='</div>';
                $("#projectListNew").append(_html);
            }else{
                _This.listParse(DATA.PROJECT);
            }

        });
        $('.changeUserType').attr('href','/m5p/swit');
    }

    this.getView=function(){
        prs.aCall("/m4a/s41v",{
            "pno":_This.pno,
            'anyView':_This.anyView
        },function(r){
            _This.errorGap=r.NOW-((new Date()).getTime()/1000);
            var DATA=r.DATA;
            var METADATA=DATA.META;
            var VIEWDATA=DATA.VIEW;
            var prj_cnt=DATA.prj_cnt;
            var my_apply=DATA.my_apply;
            // console.log(VIEWDATA);
            $('.applyHistoryModalBtn').attr('data-pno', _This.pno)
            $('#projectApplyWrap_new').hide();
            $("#projectFreeTalkDiv").show();
            $("#projectViewMidMenuRecruitFreeTalk").show();
            $("#tmpPno").val(_This.pno);


            //지원불가 프로젝트(계약 등 이유)시 마감일 마감표기
            if(VIEWDATA.isNowApply==0){
                $(".enddate_custom").text("마감");
            }else {
                if(Number(VIEWDATA.dday) > 0){
                    $(".dday_view").text("D-"+VIEWDATA.dday+"일");
                    $(".enddate_custom").text(VIEWDATA.edate + " D-" + VIEWDATA.dday+"일");
                }else if(Number(VIEWDATA.dday == 0)){
                    $(".dday_view").text("D-DAY");
                    $(".enddate_custom").text(VIEWDATA.edate + " D-DAY");
                }else{
                    $(".enddate_custom").text(VIEWDATA.edate + " 마감");
                }
            }
            $(".projectAttr").html('');
            if(VIEWDATA.isNowApply==0){
                $(".projectAttr").prepend('<p class="g">마감</p>');

                $(".projectFreeTalkInput").hide();
                $(".freeTalkMsg").hide();
            }else{
                $(".projectAttr").prepend('<p class="e">모집중</p>');

                $(".projectFreeTalkInput").show();
                $(".freeTalkMsg").show();
            }

            $("#projectWorkType").val(VIEWDATA.workType);

            if(VIEWDATA.workType == '1'){
                $(".projectAttr").prepend('<p class="b">도급</p>');
                $('.projectCostDataKey').text('예상비용');
                $("#selectWrapReal").hide();
            }else if(VIEWDATA.workType == '2'){
                $(".projectAttr").prepend('<p class="c">시간제 상주</p>');
                $('.projectCostDataKey').text('월 임금');
                $("#selectWrapDuring").hide();
                $("#selectWrapCost").hide();
            }else if(VIEWDATA.workType == '3'){
                $(".projectAttr").prepend('<p class="d">기간제 상주</p>');
                $('.projectCostDataKey').text('월 임금');
                $("#selectWrapDuring").hide();
                $("#selectWrapCost").hide();
            }else{
                if(VIEWDATA.is_stay=='1'){
                    $(".projectAttr").prepend('<p class="e">상주</p>');
                    $("#selectWrapDuring").hide();
                    $("#selectWrapCost").hide();
                }else{
                    $(".projectAttr").prepend('<p class="b">도급</p>');
                    $("#selectWrapReal").hide();
                }
                
            }
            $("#projectWorkType").val(VIEWDATA.workType);

            if(VIEWDATA.workType == "2" || VIEWDATA.workType == "3" || VIEWDATA.is_stay == '1'){
                $(".stayProjectDiv").css('display','flex');
            }else{
                $(".stayProjectDiv").css('display','none');
            }

            if(VIEWDATA.IS_NEW){
                $(".projectAttr").prepend('<p class="a">NEW</p>');
            }

            //프리톡 파싱
            var ftag='';
            $.each(VIEWDATA.COMMENTS,function(key,row){
                ftag+=freeTalkParseReplyNew(row,VIEWDATA,METADATA);
            });

            $(".commentsWrapList").html('');
            $(".commentsWrapList").html(ftag);

            // 클라이언트 이면서 내 프로젝트가 아닌경우 안보이게 처리
            if(METADATA.userType=='client'&&!METADATA.ismyproject){
                $(".projectFreeTalkInput").hide();
                $(".freeTalkMsg").hide();
                $(".cmtWrtieText").hide();
            }
            
            // 프로젝트 지원 버튼
            $("#projectApply").show();

            //지원불가 프로젝트(계약 등 이유)시 조건추가
            if(VIEWDATA.isNowApply==0){
                if(METADATA.ismyapplied=='1'){
                    $("#projectApply").removeClass('apply').addClass('applyComplete');
                    $("#projectApply").text('내 지원서 확인');
                }else{
                    $("#projectApply").hide();
                }
            }else {
                if(METADATA.ismyapplied=='0' && VIEWDATA.dday >= 0){
                    $("#projectApply").removeClass('applyComplete').addClass('apply');
                    $("#projectApply").text('프로젝트 지원하기');
                }else if(METADATA.ismyapplied=='1'){
                    $("#projectApply").removeClass('apply').addClass('applyComplete');
                    $("#projectApply").text('내 지원서 확인');
                }else{
                    $("#projectApply").hide();
                }
            }
            

            // 마감된 프로젝트인경우
            if(VIEWDATA.dday < 0){
                $("#projectApplyNone").show();
                $("#projectApplyProcess").hide();
            }else{
                $("#projectApplyNone").hide();
                $("#projectApplyProcess").show();
            }

            // 모집요건
            
            if(VIEWDATA.recruitMemo !=='' && VIEWDATA.recruitMemo !==null){
                if (VIEWDATA.recruitMemo.trim() !=='' && VIEWDATA.recruitMemo.trim() !==null){
                    $(".recruitMemo").text(VIEWDATA.recruitMemo);
                    $("#projectViewMidMenuRecruitMemo").show();
                    $("#recruitMemoDiv").show();
                }else {
                    $("#projectViewMidMenuRecruitMemo").hide();
                    $("#recruitMemoDiv").hide();
                }
            }else{
                $("#projectViewMidMenuRecruitMemo").hide();
                $("#recruitMemoDiv").hide();
            }

            var projectTypeObj  = {0:'[없음]', 1:'신규제작', 2:'리뉴얼', 3:'유지보수'};
            $(".projectType").text(projectTypeObj[VIEWDATA.projectType]);

            if(METADATA.company_info){
                $("#projectViewClientCompanyInfo").text(METADATA.company_info);
                // console.log($('#projectViewClientCompanyInfo').outerHeight(true))
                if($('#projectViewClientCompanyInfo').outerHeight(true) >150) {
                    $('#projectViewClientCompanyInfo').css('height','150px')
                    $(".clientCompanyInfoMore").show();
                } else {
                    $('#projectViewClientCompanyInfo').css('height','auto')
                    $(".clientCompanyInfoMore").hide();
                }
            }else{
                $("#projectViewClientCompanyInfo").hide();
                $(".clientCompanyInfoMore").hide();
            }

            var maskClientId = METADATA.company_userid;
            var n = maskClientId.indexOf('@');
            maskClientId = maskClientId.substring(0, n != -1 ? n : maskClientId.length);
            var newId = '';
            for(var i=0,n=0;i<maskClientId.length-2;i++){
                if(i < 1){
                    newId+=maskClientId.substring(0,3);
                }else{
                    newId+="*";
                }
                
            }

            $(".companyUserId").text(newId);

            if(METADATA.company_authHpYn){
                $(".companyAuthHpYn").addClass("chk");
                $(".companyAuthHpYn").html('<img src="/public/img/project/ico_chk-on.png" alt="연락처 인증"> 연락처 인증');
            }else{
                $(".companyAuthHpYn").removeClass("chk");
                $(".companyAuthHpYn").html('<img src="/public/img/project/ico_chk.png" alt="연락처 인증"> 연락처 미인증');
            }

            var meetYn = 'N';
            if(my_apply.userType == "freelancer"){
                if(VIEWDATA.APPLIERSINFO.LIST.length>0){
                    $.each(VIEWDATA.APPLIERSINFO.LIST,function(key,row){
                        if(my_apply.fno == row.fl_idx){
                            meetYn = 'Y';
                        }
                    });
                }
            }
			if(VIEWDATA.open_data == '0' && meetYn =='N'){
                $(".projectAddFilesShow").hide("");
                $(".projectAddFilesNone").show("");
                $("#projectAddFilesDiv").show();
			}else{
                if(VIEWDATA.FILES.length>0 && VIEWDATA.open_data != '2'){
                    var tag='';
                    $.each(VIEWDATA.FILES,function(key,row){
                        var sizeInMB = (row.size / (1024*1024)).toFixed(2);
                        tag += '<p><span>'+row.ori_nm+'<b>'+sizeInMB+' MB</b></span><a href="/m4/s4f/'+METADATA.pno+'?i='+row.file_idx+'" download><svg viewBox="0 0 471.2 471.2"><g><path d="M457.7,230.15c-7.5,0-13.5,6-13.5,13.5v122.8c0,33.4-27.2,60.5-60.5,60.5H87.5c-33.4,0-60.5-27.2-60.5-60.5v-124.8 c0-7.5-6-13.5-13.5-13.5s-13.5,6-13.5,13.5v124.8c0,48.3,39.3,87.5,87.5,87.5h296.2c48.3,0,87.5-39.3,87.5-87.5v-122.8 C471.2,236.25,465.2,230.15,457.7,230.15z"/><path d="M226.1,346.75c2.6,2.6,6.1,4,9.5,4s6.9-1.3,9.5-4l85.8-85.8c5.3-5.3,5.3-13.8,0-19.1c-5.3-5.3-13.8-5.3-19.1,0l-62.7,62.8 V30.75c0-7.5-6-13.5-13.5-13.5s-13.5,6-13.5,13.5v273.9l-62.8-62.8c-5.3-5.3-13.8-5.3-19.1,0c-5.3,5.3-5.3,13.8,0,19.1 L226.1,346.75z"/></g></svg></a></p>';
                    });
                    $(".projectAddFilesShow").html(tag);
                    $(".projectAddFilesShow").show("");
                    $(".projectAddFilesNone").hide("");
                    $("#projectAddFilesDiv").show();
                }else{
                    $("#projectAddFilesDiv").hide();
                }
            }
            
            
            if(tag) $('.prj-file').show();
            else $('.prj-file').hide();

            if(VIEWDATA.workType == '1'){
                $(".workType01").show();
                $(".workType02").hide();
                $(".workType03").hide();
                $(".workType04").hide();
            }else if(VIEWDATA.workType == '2'){
                $(".workType01").hide();
                $(".workType02").show();
                $(".workType03").hide();
                $(".workType04").hide();
            }else if(VIEWDATA.workType == '3'){
                $(".workType01").hide();
                $(".workType02").hide();
                $(".workType03").show();
                $(".workType04").hide();
            }else{
                if(VIEWDATA.is_stay == '1'){
                    $(".workType01").hide();
                    $(".workType02").hide();
                    $(".workType03").hide();
                    $(".workType04").show();
                }else{
                    $(".workType01").show();
                    $(".workType02").hide();
                    $(".workType03").hide();
                    $(".workType04").hide();
                }
            }

            $(".proj-detail-view-right").removeAttr('style');
            $("#feedbackCnt").html(DATA.COMMET_CNT);

            if(my_apply.userType == "freelancer"){
                $('.my-apply-project').attr('href','/m4/project_apply?pno='+my_apply.pno+'&fno='+my_apply.fno+'&mode=view');
            }

            $(".pnojooip").attr("data-pno",METADATA.pno).data('pno',METADATA.pno);

            if (SITE_URL_METHOD=='mobile'){
                $(".allMemoBtn").attr("data-pno",METADATA.pno).data('pno',METADATA.pno);
            }

            if(METADATA.isclipped!=1){
                $(".clipstarProjectDetail").html('<svg width="20" height="18" viewBox="0 0 20 18"><path style="fill:#aaa" d="M-3779.152,2662.781a1.164,1.164,0,0,1-.773-.294c-.808-.715-1.587-1.386-2.274-1.979l0,0a42.5,42.5,0,0,1-4.965-4.715,7.577,7.577,0,0,1-1.984-4.929,6.367,6.367,0,0,1,1.586-4.318,5.35,5.35,0,0,1,4-1.762,4.994,4.994,0,0,1,3.142,1.1,6.457,6.457,0,0,1,1.271,1.342,6.462,6.462,0,0,1,1.271-1.342,4.994,4.994,0,0,1,3.142-1.1,5.35,5.35,0,0,1,4,1.762,6.367,6.367,0,0,1,1.586,4.318,7.578,7.578,0,0,1-1.984,4.929,42.533,42.533,0,0,1-4.965,4.715c-.689.593-1.469,1.266-2.279,1.982A1.167,1.167,0,0,1-3779.152,2662.781Zm-4.413-16.815a4.2,4.2,0,0,0-3.14,1.38,5.179,5.179,0,0,0-1.276,3.515,6.376,6.376,0,0,0,1.714,4.173,41.784,41.784,0,0,0,4.823,4.569l0,0c.689.594,1.472,1.269,2.285,1.989.819-.721,1.6-1.4,2.294-1.993a41.8,41.8,0,0,0,4.823-4.568,6.376,6.376,0,0,0,1.714-4.173,5.18,5.18,0,0,0-1.276-3.515,4.2,4.2,0,0,0-3.14-1.38,3.855,3.855,0,0,0-2.426.85,5.727,5.727,0,0,0-1.352,1.583.733.733,0,0,1-.635.365.732.732,0,0,1-.635-.365,5.73,5.73,0,0,0-1.352-1.583A3.855,3.855,0,0,0-3783.565,2645.966Z" transform="translate(3789.152 -2644.781)"></path></svg> 관심 프로젝트 지정');
                $(".clipstarProjectDetail").removeClass('clipstarProjectDetailOn').addClass('clipstarProjectDetailOff');
            }else{
                $(".clipstarProjectDetail").html('<svg width="20" height="18" viewBox="0 0 20 18"><path style="fill:#ff4747" d="M-3779.152,2662.781a1.163,1.163,0,0,1-.773-.294c-.808-.715-1.587-1.386-2.274-1.979l0,0a42.445,42.445,0,0,1-4.965-4.715,7.578,7.578,0,0,1-1.984-4.929,6.364,6.364,0,0,1,1.586-4.318,5.351,5.351,0,0,1,4-1.762,4.994,4.994,0,0,1,3.142,1.1,6.446,6.446,0,0,1,1.271,1.343,6.482,6.482,0,0,1,1.27-1.343,5,5,0,0,1,3.143-1.1,5.351,5.351,0,0,1,4,1.762,6.367,6.367,0,0,1,1.586,4.318,7.578,7.578,0,0,1-1.984,4.929,42.545,42.545,0,0,1-4.964,4.715c-.689.593-1.469,1.266-2.279,1.982A1.167,1.167,0,0,1-3779.152,2662.781Z" transform="translate(3789.152 -2644.781)"></path></svg> 관심 프로젝트');
                $(".clipstarProjectDetail").addClass('clipstarProjectDetailOn').removeClass('clipstarProjectDetailOff');
            }

            function prj_pop_hide(){
                if(SITE_URL_METHOD == 'pc'){
                    layerPopupClose('#additionalInfo')
                }else{
                    $('#additional_info').modal('hide');
                }
            }

            function prj_pop_show() {
                if(SITE_URL_METHOD == 'pc'){
                    layerPopupOpen('#additionalInfo');
                }else{
                    $('#additional_info').modal('show');
                }
            }

            $(document).on('click', '#additional-popup-cancel', function () {
                prj_pop_hide();
            });

            $(document).ready(function () {


                var user_number = $('#user_num').val();
                var isLogin = $('#projectAddWrap').data('isLogin');
                prs.aCall("/m4a/project_complete_popup",{
                    user_num : user_number,
                    type:'popup'
                },function(r) {
                    var is_popup = r.DATA.is_popup;
                    var register = r.DATA.register;
                    var picture_url = r.DATA.picture_url;

                    if(!register) return;
                    if(register.company_info) $('.popup-textarea').val(register.company_info);
                    if(register.pic_idx) $('#register_picture').attr('src', picture_url+'-106-106-1');
                    // if(is_popup) layerPopupOpen('#additionalInfo');
                    if(is_popup) prj_pop_show();


                    /*   if(!isLogin && !is_popup){
                        if(confirm('등록된 프로젝트를 확인하기 위해 로그인 하시겠습니까? ')){
                            location.replace('/m0/s02');
                        }
                    }*/
                });

                formAndBtnPair($("#additionalForm"),$("#additionalSubmitBtn"),null,true,function (r) {
                    // 이메일
                    var cp_info = $('#company_info').val();
                    if(!cp_info && cp_info.length <= 0){
                        alert('클라이언트님의 회사를 소개해주세요.');
                        $('#company_info').focus();
                        return false;
                    }
                    return true;
                },function(r){
                    if(r.DATA){
                        alert('회사소개를 수정하였습니다.');
                        prj_pop_hide();
                    }
                });


                $("#myPicFileInput").change(function(){
                    var t=$(this);
                    if (t.val()=="") return false;
                    if (!fileExtValidation(t)) return false;

                    prs.aCallFile("/my/picChange",null,t,function(r){
                        var filename = t.val().split('\\').pop().split('/').pop();
                        var src="/public/images/sub/thumb/img-profile.jpg";
                        src=r.DATA.picURL+"-106-106-1";
                        $('#ai-pic-name').text(filename)
                        $("#register_picture").attr("src",src);
                    });

                });
            });

            if($('.get_cl_idx').val() == VIEWDATA['cl_idx']){
                $('.change_my_info').css('display','block');
                $(".change_my_info").click(function(){
                    prj_pop_show();
                });
            }
            //본인등록프로젝트
            if (METADATA.ismyproject==1){
                $("#freetalkSubmitBtn,#freetalkInput,#projectHideComment").attr('disabled',false);
                applierParse.applierListParse(METADATA.pno,VIEWDATA.APPLIERS);
                $("#projectAppliersListWrap").show();
            }
            else{
                $("#freetalkSubmitBtn,#freetalkInput,#projectHideComment").attr('disabled',true);
                $("#projectAppliersListWrap").hide();
            }

            //본인지원프로젝트
            if (METADATA.ismyapplied==1){
                $(".hide-applier").hide();
                $(".hide-applier2").hide();
                if(DATA.request > 0 && DATA.request != null){
                    $(".hide-non-applier").hide();
                    $(".hide-non-applier2").show();
                }else{
                    $(".hide-non-applier2").hide();
                    $(".hide-non-applier").show();
                }
            } else{
                $(".hide-non-applier").hide();
                $(".hide-non-applier2").hide();
                $(".hide-applier").hide();
                $(".hide-applier2").hide();

                if(DATA.request > 0 && DATA.request != null){
                    $(".hide-applier").hide();
                    $(".hide-applier2").show();
                   
                }else{
                    $(".hide-applier2").hide();
                    $(".hide-applier").show();
                    $(".hide-applier").not(".hide-magam").show();
                }

                
                if (METADATA.isNowApply==1){
                    $(".hide-applier.hide-magam").show();
                }else{
                    $(".hide-applier").hide();
                    $(".hide-applier2").hide();
                }
            }

            var edate = moment(VIEWDATA.edate);
            var today = moment();
            var asEday = edate.diff(today,'days');
            if(asEday < 0){
                $('.recruit-deadline').show();
            }else{
                $('.recruit-deadline').hide();
            }

            if (METADATA.starHide){
                //$("#projectViewTitle").removeClass("bg");
            }
            else{
                $("#freetalkSubmitBtn,#freetalkInput,#projectHideComment").attr('disabled',false);
            }

            $(".projectInfoData").each(function(){
                var name=$(this).attr("data-name");
                var type=$(this).attr("data-type");
                var viewText = VIEWDATA[name];
                $(this)[(type=="html")?type:"text"]((viewText)?viewText:'[없음]');
            });

            var detailText = $("#projectInfoDataDetail").html();
            detailText = detailText.replace('※프로젝트의 현재 상황','<b style="font-size:15px">※프로젝트의 현재 상황</b>');
            detailText = detailText.replace('※프로젝트의 진행 방식','<b style="font-size:15px">※프로젝트의 진행 방식</b>');
            detailText = detailText.replace('※상세한 업무내용','<b style="font-size:15px">※상세한 업무내용</b>');
            detailText = detailText.replace('※참고사항','<b style="font-size:15px">※참고사항</b>');
            $("#projectInfoDataDetail").html(detailText);

            var ddayCount = VIEWDATA['dday'];
            if( ddayCount < 0){
                $(".dday_view").html('마감');
            }
            


            $('.projectServiceData').each(function () {
                var name=$(this).data("name");
                if(VIEWDATA[name] == 1){
                    $(this).addClass('use');
                }
            });

            $('.projectCostData').html(function (index, content) {
                var cost = costViewOrigin(VIEWDATA.cost_min, VIEWDATA.cost_max);
                return cost;
            });

            $('.projectSumCost').html(function(index, content){
                var name = $(this).attr("data-name");
                var cost = costViewOrigin(prj_cnt[name], prj_cnt[name], " ");
                return cost;
            });


            $('.projectInfoNumber').each(function(){

                var name=$(this).attr("data-name");
                $(this).text((prj_cnt[name])? numWithComma(prj_cnt[name]) :'0');


            });


            $('.projectInfoNumber[data-name = "all_cnt"]').text(function(){
                return Number(prj_cnt['accumulate_cnt']) ;
            });



            $('.projectInfoNumber[data-name = "contract_cnt"]').text(function(){

                return  Number(prj_cnt['contract_cnt']);//Number(prj_cnt['work_cnt'])  + Number(prj_cnt['complete_cnt']) ;
            });

            $('.projectInfoNumber[data-name = "sum_cost"]').text(function(){
                
                var totalcost = parseInt(prj_cnt['sum_cost'])+'0000';
                if(totalcost=='00000'){
                    totalcost = 0;
                }
                return totalcost.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            });

            var getContractNum = Number(prj_cnt['contract_cnt']) + Number(prj_cnt['work_cnt'])  + Number(prj_cnt['complete_cnt']) ;

            if( getContractNum == 0){
                $('.accumulate_price').css('display','none');
            }



            function numWithComma(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }

            var ins_date = moment(VIEWDATA.INS_TIME).format('YYYY.MM.DD');
            $('.projectInfoDate').text(ins_date);

            if(VIEWDATA.cmt){
                $('.amin_cmt').show()
            }else{
                $('.amin_cmt').hide()
            }


            var ltag='';
            var proj_language = (VIEWDATA.proj_language) ? VIEWDATA.proj_language.split(',') : '';
            if(proj_language.length){
                $(".prj-need-tech-new").show();
                ltag = "<span>관련기술</span>";
                $.each(proj_language,function(key,val){
                    ltag+='<p>'+val+'</p>';
                });
                $(".prj-need-tech-new").html(ltag);
            }else{
                $(".prj-need-tech-new").hide();
            }

            $("#projectViewClientImage").attr("src",(METADATA.PICTURE_URL)?METADATA.PICTURE_URL+'-144-144-1' : '/public/img/photo.jpg');
            $("#register_picture").attr("src",(METADATA.PICTURE_URL)?METADATA.PICTURE_URL+'-144-144-1' : '/public/img/photo.jpg');
            $("#projectViewMyImage").attr("src",(VIEWDATA.my_pic_url) ? VIEWDATA.my_pic_url+'-70-70-1' : '/public/img/photo.jpg');

            

            var link = VIEWDATA.reference_url;
            if (!/^(f|ht)tps?:\/\//i.test(VIEWDATA.reference_url)) {
                var link = "http://" + VIEWDATA.reference_url;
            }


            if(typeof VIEWDATA.reference_url == "undefined" ||  VIEWDATA.reference_url == 0){
                $('#projectUrl').html('-');
            }else{
                $('#projectUrl').html('<a href="'+link+'" target="_blank" style="text-decoration: underline;color: #0282cc;">'+VIEWDATA.reference_url+'</a>');
            }





            if(VIEWDATA.reference_url) $('.prj-url').show();
            else $('.prj-url').hide();

            $('.prj-url').hide();
            var view_edate = moment(VIEWDATA.edate, "YYYY-MM-DD").add('days', 1); //moment(VIEWDATA.edate);
            view_edate = view_edate.format('YYYY-MM-DD');
            $("#projectViewTimeView").attr("data-endtime",VIEWDATA.endtime);
            $("#projectViewTimeView").attr("data-edate",view_edate);

            if (METADATA.isNowApply==1){
                $("#projectViewTimeView").addClass("timeView");
            }else{
                $(".timeUnit").text("마감");
            }

            

            $("#projectListWrap").hide();
            $("#projectViewWrap").show();
            //프로젝트 열람시 상단 검색 배너 숨김_210316bySOON
            $(".projectHeadSearchWrap").hide();
            //프로젝트 열람시 배경 흰색으로
            $('.subWrap.content').css({'background-color':'#fff'})
            var link = document.location.href;
            var getFirstPno = getParameterByName('pno');
            $('.changeUserType').attr('href','/m5p/swit?redirect=/m4/s41?first_pno='+getFirstPno);
            $(window).scrollTop(0);
            $(".filed_dot").dotdotdot({height:39});

            
            if($("#applyview").val()=='y'){
                $("#projectApply").click();
            }
            


            var getfreeurl = window.location.href;

            if(getfreeurl.indexOf('freeTalkGo') != -1){
                /*$('html, body').animate({
                    scrollTop: $("#freeTalkGo").offset().top
                }, 1000);*/
                window.location.hash = '#freeTalkGo';

            }
        });
    };

    this.commentParse=function(row){
        var tag='';
        //tag+='<strong>'+row.usertype+'</strong>: ';
        //tag+=htmlspecialchars(row.txt)+'<br/>';

        tag+='<div class="answer">';
        tag+='	<span>['+row.usertype+']</span>';
        tag+='	<p>'+htmlspecialchars(row.txt)+'</p>';
        tag+='	<button type="button" class="btn btn-xxs btn_brw btn_shadow">삭제요청</button>';
        tag+='</div>';

        return tag;
    };
    this.listParse=function(PROJECT){
        var starHide=PROJECT.starHide;
        var tag='';
        var asEday, edate, ins_date, prjEday;
        var wherePage = $("#projectListNew").data('page');
        var isFreelancer = $('#projectListNew').data('isFreelancer');

        var view_prj_cookie = '';
        var value_or_null = (document.cookie.match(/^(?:.*;)?\s*view-prj\s*=\s*([^;]+)(?:.*)?$/)||[,null])[1];
        if(value_or_null){
            var view_prj_cookie = $.cookie('view-prj').split('-');
            view_prj_cookie.splice(view_prj_cookie.indexOf(""),1);
            //view_prj_cookie = $.cookie('view-prj');
        }


        $.each(PROJECT.LIST, function(key, row){
            // console.log(row)
            var isviewable=row.isviewable;
            var isNowApply=row.isNowApply;
            var isapplied=row.isapplied;
			/*
			 * 모집중 ing
			 * 마감임박 impend
			 * 마감 finish
			 */
            edate = moment(row.edate);
            edate = edate.add('days',1);
            ins_date = moment(row.INS_TIME);
            var today = moment();

            //asEday = Math.floor(edate.diff(ins_date,'days',true));
            asEday = edate.diff(today,'days');

            if (SITE_URL_METHOD=='pc'){

                
                var is_comming_close = false;
                // if(isNowApply==0) {
                //     prjEday = '마감';
                // }else{
                //     prjEday = (asEday > 0) ? '<span class="">D-</span>'+asEday : '마감';
                // }

                
                var background_color="";
                if(isNowApply==0) {
                    background_color="background: #676664;"
                    prjEday = '마감';
                }else{
                    prjEday = (asEday > 0) ? "D-"+asEday : '마감';
                    background_color = (asEday > 0) ? '' : 'background: #676664;';
                }
                var time = moment().endOf('day').format('YYYY MM DD HH:mm:ss');
                var getms = moment(time).diff(moment());
                var now = new Date();
                var end = new Date();
                with(end) {
                    setDate(now.getDate()+1);
                    setHours(0);
                    setMinutes(0);
                    setSeconds(0);
                    setMilliseconds(0);
                }
                var result = end - now;
                if(asEday == 0){
                    is_comming_close = true;
                    //prjEday =   _This.DisplayTime(result);
                    prjEday='D-DAY';
                }

                var maskClientId = row.client_id;
                var n = maskClientId.indexOf('@');
                maskClientId = maskClientId.substring(0, n != -1 ? n : maskClientId.length);
                var newId = '';
                for(var i=0,n=0;i<maskClientId.length-2;i++){
                    if(i < 1){
                        newId+=maskClientId.substring(0,3);
                    }else{
                        newId+="*";
                    }
                   
                }
                var splitProjLanguage;
                if(row.proj_language){
                    splitProjLanguage = row.proj_language.split(',');
                }
                //maskClientId = maskClientId.substring(0, maskClientId.indexOf('@'));
                //vip부분 소스 지금은 삭제 (우수)<div class="prjct-state vip tooltip-container" style="margin-left: 1px;"><span class="tooltiptext">기존에 프리모아와 진행 완료한<br />프로젝트가 있는 클라이언트의<br />프로젝트 입니다.</span></div>



                tag += '<li class="proj-list-item_li_new">';
                tag += '    <div>';

                // tag += '<span class="subj  ellipsis prjct-info-title-txt projectInfo ';
                //     //((view_prj_cookie.indexOf(row.proj_idx+'-') !== -1) ? 'haslookprj' : '') +
                // if(view_prj_cookie != ''){
                //     view_prj_cookie.forEach(function(element) {
                //         tag += (element==row.proj_idx) ? 'haslookprj' : '' ;
                //     });
                // }
                // tag +=  '" data-pno="'+row.proj_idx+'" style="cursor:pointer">'+((row.title)?htmlspecialchars(row.title):'[제목없음]')+'</span>';
                // tag += '<span class="date">'+ moment(row.INS_TIME).format("YYYY.MM.DD") + '</span>'+
                // '<div class="status-wrap">';

                
                tag += '        <div class="projTitle projectInfo ';
                if(view_prj_cookie != ''){
                    view_prj_cookie.forEach(function(element) {
                        tag += (element==row.proj_idx) ? 'haslookprj' : '' ;
                    });
                }
                tag += '" data-pno="'+row.proj_idx+'" valid.open = "'+row.isopen+'" style="cursor:pointer">'
                tag += '<p class="title">'+((row.title)?htmlspecialchars(row.title):'[제목없음]')+'</p>'
                tag += '<b class="date"></b></div>';
                tag += '<div>';

                //1=도급,2=시간제상주,3=기간제상주
                if(row.workType == '1'){
                    tag += '            <p class="b">도급</p>';
                }else if(row.workType == '2'){
                    tag += '            <p class="c">시간제 상주</p>';
                }else if(row.workType == '3'){
                    tag += '            <p class="d">기간제 상주</p>';
                }else{
                    if(row.is_stay=='0'){
                        tag += '            <p class="b">도급</p>';
                    }else{
                        tag += '            <p class="e">상주</p>';
                    }
                }

                tag += ((isNowApply==0)?'<p class="g">마감</p>':(is_comming_close)?'<p class="f">마감임박</p>':'<p class="e">모집중</p>') + ((row.is_new) ? '' : '');

                if(!starHide){
                    tag += '<div class="'+((row.isclipped==1)?'on':'')+'">';
                    tag += '<a style ="z-index:999;" href="#" class="clipstar2 '+((row.isclipped==1)?'on':'')+'" data-star="'+row.proj_idx+'">';
                    if(row.isclipped==1){
                        tag += '    <svg width="20" height="18" viewBox="0 0 20 18"><path style="fill:#ff4747" d="M-3779.152,2662.781a1.163,1.163,0,0,1-.773-.294c-.808-.715-1.587-1.386-2.274-1.979l0,0a42.445,42.445,0,0,1-4.965-4.715,7.578,7.578,0,0,1-1.984-4.929,6.364,6.364,0,0,1,1.586-4.318,5.351,5.351,0,0,1,4-1.762,4.994,4.994,0,0,1,3.142,1.1,6.446,6.446,0,0,1,1.271,1.343,6.482,6.482,0,0,1,1.27-1.343,5,5,0,0,1,3.143-1.1,5.351,5.351,0,0,1,4,1.762,6.367,6.367,0,0,1,1.586,4.318,7.578,7.578,0,0,1-1.984,4.929,42.545,42.545,0,0,1-4.964,4.715c-.689.593-1.469,1.266-2.279,1.982A1.167,1.167,0,0,1-3779.152,2662.781Z" transform="translate(3789.152 -2644.781)"/></svg>';
                    }else{
                        tag += '    <svg  width="20" height="18" viewBox="0 0 20 18"><path style="fill:#aaa" d="M-3779.152,2662.781a1.164,1.164,0,0,1-.773-.294c-.808-.715-1.587-1.386-2.274-1.979l0,0a42.5,42.5,0,0,1-4.965-4.715,7.577,7.577,0,0,1-1.984-4.929,6.367,6.367,0,0,1,1.586-4.318,5.35,5.35,0,0,1,4-1.762,4.994,4.994,0,0,1,3.142,1.1,6.457,6.457,0,0,1,1.271,1.342,6.462,6.462,0,0,1,1.271-1.342,4.994,4.994,0,0,1,3.142-1.1,5.35,5.35,0,0,1,4,1.762,6.367,6.367,0,0,1,1.586,4.318,7.578,7.578,0,0,1-1.984,4.929,42.533,42.533,0,0,1-4.965,4.715c-.689.593-1.469,1.266-2.279,1.982A1.167,1.167,0,0,1-3779.152,2662.781Zm-4.413-16.815a4.2,4.2,0,0,0-3.14,1.38,5.179,5.179,0,0,0-1.276,3.515,6.376,6.376,0,0,0,1.714,4.173,41.784,41.784,0,0,0,4.823,4.569l0,0c.689.594,1.472,1.269,2.285,1.989.819-.721,1.6-1.4,2.294-1.993a41.8,41.8,0,0,0,4.823-4.568,6.376,6.376,0,0,0,1.714-4.173,5.18,5.18,0,0,0-1.276-3.515,4.2,4.2,0,0,0-3.14-1.38,3.855,3.855,0,0,0-2.426.85,5.727,5.727,0,0,0-1.352,1.583.733.733,0,0,1-.635.365.732.732,0,0,1-.635-.365,5.73,5.73,0,0,0-1.352-1.583A3.855,3.855,0,0,0-3783.565,2645.966Z" transform="translate(3789.152 -2644.781)"/></svg>';
                    }
                    tag += '</a>';
                    tag += '</div>';
                }

                tag += '        </div>';
                tag += '    </div>';
                tag += '    <div class = "projectInfo" data-pno="'+row.proj_idx+'" valid.open = "'+row.isopen+'">';
                tag += '        <div>'+row.proj_filed_new+'</div>';
                for ( var i in splitProjLanguage ) {
                    tag += '        <p>'+ splitProjLanguage[i] + '</p>';
                }
                tag += '    </div>';
                tag += '    <div class = "projectInfo" data-pno="'+row.proj_idx+'" valid.open = "'+row.isopen+'">';
                if(row.workType == '1') {
                    tag += '        <p><span>예상비용</span><b>'+((isviewable==1) ? costViewOrigin(row.cost_min,row.cost_max): '비공개')+'</b></p>';
                } else {
                    tag += '        <p><span>월 임금</span><b>'+((isviewable==1) ? costViewOrigin(row.cost_min,row.cost_max): '비공개')+'</b></p>';
                }
                
                tag += '        <p><span>예상기간</span><b>' + ((isviewable==1) ? row.during+'일':'비공개') + '</b></p>';
                tag += '        <p><span>지원자수</span><b>'+ ((isviewable==1) ? row.ALL_APPLY_COUNT+'</span>명':'비공개') +'</b></p>';
                tag += '        <p><span>마감일정</span><b>'+((isviewable==1) ?  prjEday: '비공개')+'</b></p>';
                tag += '    </div>';
                tag += '    <div class = "projectInfo" data-pno="'+row.proj_idx+'" valid.open = "'+row.isopen+'">';
                tag += '        <div class="'+(row.isopen!=1?'hideProject':'')+'">';
                if (row.isopen==1) {
                    tag += htmlspecialchars(row.txt);
                } else {
                    tag += '<div class="hideProjectMsg"><svg viewBox="0 0 448 512"><path fill="#fff" d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"></path></svg><b>비공개 프로젝트 입니다.</b></div>'
                    tag += '<p>견적 요청을 받은 개별 파트너만 프로젝트 열람 및 지원 가능합니다.</p>';
                }

                tag += '        </div>';
                tag += '        <div>';
                tag += '            <div>';
                tag += '                <img src="'+((row.picture_url) ? row.picture_url+'-36-36-1' : '/public/img/photo.jpg')+'">';
                tag += '                <div>';
                tag += '                    <p><span>'+newId+'</span>';
                tag += '                    <b>'+((isviewable==1) ? ((row.pv_smallnm)?row.pv_smallnm:'') : '비공개')+'</b></p>';
                tag += '                    <div><svg class="'+(row.authHpYn=='N'?'fiilGray':'fiilOrange')+'" width="12px" height="12px" viewBox="0 0 512 512"><path d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.11l60.6-49.6a23.94 23.94 0 0 0 6.9-28l-48-112A24.16 24.16 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.5 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24.29 24.29 0 0 0-14.01-27.6z"></path></svg>연락처 '+(row.authHpYn=='N'?'미인증':'인증')+'</div>';
                tag += '                </div>';
                tag += '            </div>';
                if (row.company_info) {
                    tag += '<p>'+row.company_info+'</p>'
                }
                tag += '        </div>';
                tag += '    </div>';
                tag += '</li>';
            }

        });
        $("#projectListNew").append(tag);
        $("#projectPagination").append(paginationTag(PROJECT.PAGINATION));
        $('.prjct-info-txt').dotdotdot({height:63});
        $('.prjct-about-top-content').dotdotdot({height:50});


        var nowPage = $("#projectPagination a.on").text();
        $('#go_back_prj_list').attr('href', '/m4/s41?page='+nowPage);
        $(window).scrollTop(0);
        afterLoad();
    }

    this.listParse2=function(PROJECT){
        var starHide=PROJECT.starHide;
        var tag='';
        var asEday, edate, ins_date, prjEday;
        var wherePage = $("#projectList").data('page');
        var isFreelancer = $('#projectList').data('isFreelancer');

        var view_prj_cookie = '';
        var value_or_null = (document.cookie.match(/^(?:.*;)?\s*view-prj\s*=\s*([^;]+)(?:.*)?$/)||[,null])[1];
        if(value_or_null){
            var view_prj_cookie = $.cookie('view-prj').split('-');
            view_prj_cookie.splice(view_prj_cookie.indexOf(""),1);
            //view_prj_cookie = $.cookie('view-prj');
        }


        $.each(PROJECT.LIST, function(key, row){
            // console.log(row)
            var isviewable=row.isviewable;
            var isNowApply=row.isNowApply;
            var isapplied=row.isapplied;
			/*
			 * 모집중 ing
			 * 마감임박 impend
			 * 마감 finish
			 */
            edate = moment(row.edate);
            edate = edate.add('days',1);
            ins_date = moment(row.INS_TIME);
            var today = moment();

            //asEday = Math.floor(edate.diff(ins_date,'days',true));
            asEday = edate.diff(today,'days');

            if (SITE_URL_METHOD=='pc'){


                var is_comming_close = false;
                // if(isNowApply==0) {
                //     prjEday = '마감';
                // }else{
                //     prjEday = (asEday > 0) ? '<span class="">D-</span>'+asEday : '마감';
                // }

                
                var background_color="";
                if(isNowApply==0) {
                    background_color="background: #676664;"
                    prjEday = '마감';
                }else{
                    prjEday = (asEday > 0) ? "D-"+asEday : '마감';
                    background_color = (asEday > 0) ? '' : 'background: #676664;';
                }
                var time = moment().endOf('day').format('YYYY MM DD HH:mm:ss');
                var getms = moment(time).diff(moment());
                var now = new Date();
                var end = new Date();
                with(end) {
                    setDate(now.getDate()+1);
                    setHours(0);
                    setMinutes(0);
                    setSeconds(0);
                    setMilliseconds(0);
                }
                var result = end - now;
                if(asEday == 0){
                    is_comming_close = true;
                    //prjEday =   _This.DisplayTime(result);
                    prjEday='D-DAY';
                }

                var maskClientId = row.client_id;
                var n = maskClientId.indexOf('@');
                maskClientId = maskClientId.substring(0, n != -1 ? n : maskClientId.length);
                var newId = '';
                for(var i=0,n=0;i<maskClientId.length-2;i++){
                    if(i < 1){
                        newId+=maskClientId.substring(0,3);
                    }else{
                        newId+="*";
                    }
                   
                }
                tag += '<li>' +
                    '<div class="proj-header">';
                if(!starHide){
                    tag += '<a href="#" class="subj star clipstar2 '+((row.isclipped==1)?'on':'')+'" data-star="'+row.proj_idx+'"></a>';
                }
           

                tag += '<span class="subj  ellipsis prjct-info-title-txt projectInfo ';
                    //((view_prj_cookie.indexOf(row.proj_idx+'-') !== -1) ? 'haslookprj' : '') +
                if(view_prj_cookie != ''){
                    view_prj_cookie.forEach(function(element) {
                        tag += (element==row.proj_idx) ? 'haslookprj' : '' ;
                    });
                }
                tag +=  '" data-pno="'+row.proj_idx+'" style="cursor:pointer">'+((row.title)?htmlspecialchars(row.title):'[제목없음]')+'</span>';
                tag += '<span class="date">'+ moment(row.INS_TIME).format("YYYY.MM.DD") + '</span>'+
                 '<div class="status-wrap">';

                if(row.is_pro == '1'){
                    tag += '<div class="s04">PRO '+
                            '    <div class="bubble">신뢰도 높은 “도급 프로젝트”와 엄선된”파트너”의 <br />프리미엄 매칭 서비스</div> '+
                            '</div>	';
                }
                //1=도급,2=시간제상주,3=기간제상주
                if(row.workType == '1'){
                    tag += '<span class="s06">도급</span>';
                }else if(row.workType == '2'){
                    tag += '<div class="s05">시간제 상주 '+
                                '<div class="bubble">IT전문가를 시간단위로 고용하는 방식(기준 : 일 8시간)</div> '+
                            '</div>	';
                }else if(row.workType == '3'){
                    tag += '<div class="s01">기간제 상주 '+
                                '<div class="bubble">IT전문가를 월 기간단위로 고용하는 방식(기준 : 1개월)</div> '+
                            '</div>	';
                }else{
                    tag += ((row.is_stay == '1') ? '<span class="s01">상주</span>' : '');
                }

                tag += ((isNowApply==0)?'<span class="s02" style="'+background_color+'">마감</span>':(is_comming_close)?'<span class="s02" style="background: #ee5a00;padding-right: 3px; padding-left : 3px">마감임박</span>':'<span class="s02">모집중</span>')+
                ((row.is_new) ? '<span class="s03">NEW</span>' : '') +
                '	</div>'+
                '</div>';
                tag += '<div class="proj-point">';
                if(row.workType == 1){
            
                tag +='	<div class="point-item t01">'+
                '		<span>예산비용</span>'+
                '		<strong class="black">'+((isviewable==1)?costViewOrigin(row.cost_min,row.cost_max):'비공개')+'</strong>'+
                '	</div>';
                }else if(row.workType == 2){
                tag +='	<div class="point-item t01">'+
                '		<span>예산비용</span>'+
                '		<strong class="black">'+((isviewable==1)?costViewOrigin(row.cost_min,row.cost_max):'비공개')+'</strong>'+
                '	</div>';

                }else if(row.workType == 3){
                tag +='	<div class="point-item t01">'+
                '		<span>월단가</span>'+
                '		<strong class="black">'+((isviewable==1)?costViewOrigin(row.cost_min,row.cost_max):'비공개')+'</strong>'+
                '	</div>';

                }else{

                tag +='	<div class="point-item t01">'+
                '		<span>예산비용</span>'+
                '		<strong class="black">'+((isviewable==1)?costViewOrigin(row.cost_min,row.cost_max):'비공개')+'</strong>'+
                '	</div>';   
                }

                tag +='	<div class="point-item t02">'+
                '		<span>기간</span>'+
                '		<strong>' + ((isviewable==1) ? row.during+'일':'비공개') + '</strong>'+
                '	</div>'+
                '	<div class="point-item t02">'+
                '		<span>마감</span>'+
                '		<strong>'+((isviewable==1) ?  prjEday: '비공개')+'</strong>'+
                '	</div>';
                tag +='	<div class="point-item t02">'+
                '		<span>지원자수</span>'+
                '		<strong class="org">'+ ((isviewable==1) ? row.ALL_APPLY_COUNT+'</span>명':'비공개') +'</strong>'+
                '	</div>';
                if(row.plan_nm == '아이디어 단계'){
                	tag+= '	<div class="point-item ac">'+
                        '		<img src="/public/img/project/ico-point-list01.png" />'+
                        '		<span>아이디어 구체화</span>'+
                        '	</div>';
                }else if(row.plan_nm == '필요기능 정리'){
                	tag+= '	<div class="point-item ac">'+
                        '		<img src="/public/img/project/ico-point-list02.png" />'+
                        '		<span>기능 정의서 작성</span>'+
                        '	</div>';
                }else if(row.plan_nm == '기획 작성중'){
                	tag+= '	<div class="point-item ac">'+
                        '		<img src="/public/img/project/ico-point-list03.png" />'+
                        '		<span>기획 작성중</span>'+
                        '	</div>';
                }else{
                	tag+= '	<div class="point-item ac">'+
                        '		<img src="/public/img/project/ico-point-list04.png" />'+
                        '		<span>상세 기획서 작성</span>'+
                        '	</div>';
                }
                

                tag+= '</div>';

                tag+= '<div class="proj-etc">';
                if(row.is_pro == '1'){
                tag+=  '<div class="proj-etc-left"> '+
                       '    <div class="pro-guide-wrap"> '+
                       '        <p class="desc">PRO 파트너스만 열람 및 지원 가능합니다.</p>  '+
                       '        <a href="javascript:void(0)">PRO서비스 안내</a>  '+
                       '    </div>'+
                       ' </div>';

                }else{
                tag+='	<div class="proj-etc-left">'+
                    '		<div class="cate-wrap">'+
                    '	        <span class="cate">'+row.proj_filed+'</span>'+
                    '		    <span class="keword">'+((row.proj_language) ? row.proj_language : '')+'</span>'+
                    '		</div>'+ 
                    '		<div class="proj-desc">'+((isviewable==1)?htmlspecialchars(row.txt):'비공개 프로젝트입니다.<br/>&nbsp;<br/>&nbsp;')+
                    '		</div>'+
                    '	</div>';
                }

                tag	+= '<div class="proj-etc-right">'+
                '		    <div class="m-info">'+
                '			    <img src="'+((row.picture_url) ? row.picture_url+'-36-36-1' : '/public/img/photo.jpg')+'" />'+
                '			    <strong>' + newId + '</strong>'+
                '			    <span>'+((isviewable==1) ? ((row.pv_smallnm)?row.pv_smallnm:'') : '비공개')+'</span>'+
                '		    </div>'+
                '		    <div class="m-desc">'+((row.company_info) ? row.company_info : '회사 소개가 없습니다.')+'</div>'+
                '	    </div>'+
                '  </div>'+
                '</li>';

            }

        });
        $("#projectListNew").append(tag);
        $("#projectPagination").append(paginationTag(PROJECT.PAGINATION));
        $('.prjct-info-txt').dotdotdot({height:63});
        $('.prjct-about-top-content').dotdotdot({height:50});


        var nowPage = $("#projectPagination a.on").text();
        $('#go_back_prj_list').attr('href', '/m4/s41?page='+nowPage);
        $(window).scrollTop(0);


    }

}

var pj=new Project();

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function selectSortBox(selectValue){
    // alert(selectValue);
    $("#"+selectValue).
    click();
}

function moveToApplyZone(){
    const id = 'projectApplyWrap_new';
    const yOffset = -65; 
    const element = document.getElementById(id);
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

    var agent = navigator.userAgent.toLowerCase();
    if ( (navigator.appName == 'Netscape' && agent.indexOf('trident') != -1) || (agent.indexOf("msie") != -1)) {
        $('html').animate({scrollTop : y}, 0);// ie일 경우
    }else{
        window.scrollTo({top: y, behavior: 'smooth'});// ie가 아닐 경우
    }
}

function moveToDiv(targetDiv){
    const id = targetDiv;
    const yOffset = -65; 
    const element = document.getElementById(id);
    const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
    
    var agent = navigator.userAgent.toLowerCase();
    if ( (navigator.appName == 'Netscape' && agent.indexOf('trident') != -1) || (agent.indexOf("msie") != -1)) {
        $('html').animate({scrollTop : y}, 0);// ie일 경우
    }else{
        window.scrollTo({top: y, behavior: 'smooth'});// ie가 아닐 경우
    }
}

function getPorfolio(){

    $("#portfolioList").html('');
    var page=$(this).data('page');

    prs.aCall("/Portfolio/portfolioList",{
        row:100000,
        page:page,
        filter:'fno'
    },function(data){

        var paging = data.DATA.pagination;
        var PORTFOLIO = data.DATA.PORTFOLIO;
        var starHide=PORTFOLIO.starHide;
        var PIC_URL=PORTFOLIO.PICTURE_URL;
        var comma = ', ';
        var html ='';

        $("#portfolioList").children("li").remove();
        $(".portfolio-popup-list .pg_wrap").remove();
        if(PORTFOLIO.LIST.length){
            
            PORTFOLIO.LIST.forEach( function( row, i ){
                // console.log(row);
                if (row.tags == ''){var rowTags = "off"}else{var rowTags = ""}
                html += '<div data-pfno="'+row.pf_idx+'" class="portFolioCard">';
                html += '    <div>';
                html += '        <p>';
                html += '            <svg viewBox="0 0 512 512"><path fill="currentColor" d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"></path></svg>';
                html += '        </p>';

                if(row.IMAGES){
                    html += '<img src="'+PIC_URL+'p/'+row.pf_idx+'/'+row.IMAGES[0]+'-224-165-1" alt="이미지" width="100%" />';
                }else{
                    if(row.VIDEO!=undefined){
                        html += ' <iframe src="'+row.VIDEO+ '" style="height:230px;witdh:170px"></iframe>';
                    }
                }
                html += '    </div>';
                html += '    <p>';
                html += '        <span>'+htmlspecialchars(row.title)+'</span>';
                html += '    </p>';
                html += '    <b class="'+rowTags+'">';

                $.each(row.tags, function (key, row) {
                    html += '#'+row.pf_tags;
                });
                html += '</b>';
                html += '</div>';
            });
            $("#portfolioList").append(html);
        }else{
            alert('포트폴리오 없음');
        }
    });
}

function getStayInfoList(){
     // 상주 정보 가져오기
    var selectWrapList = $("#selectWrapReal").find('.selectWrap');
    var selectWrapListArr = [];
    for(i=0; i<selectWrapList.length; i++) {
        
        if(selectWrapList.eq(i).find('.resideTech').val()==undefined||selectWrapList.eq(i).find('.resideTech').val()=='') return false;
        if(selectWrapList.eq(i).find('.resideCareer').val()==undefined||selectWrapList.eq(i).find('.resideCareer').val()=='') return false;
        if(selectWrapList.eq(i).find('.residePerson').val()==undefined||selectWrapList.eq(i).find('.residePerson').val()=='') return false;
        if(selectWrapList.eq(i).find('.residePay').val()==undefined||selectWrapList.eq(i).find('.residePay').val()=='') return false;

        var tmpArr = {
            'resideTech':selectWrapList.eq(i).find('.resideTech').val(),
            'resideCareer':selectWrapList.eq(i).find('.resideCareer').val(),
            'residePerson':selectWrapList.eq(i).find('.residePerson').val(),
            'residePay':selectWrapList.eq(i).find('.residePay').val(),
        }
        selectWrapListArr[i] = tmpArr;
    }
    var jsonString = JSON.stringify(selectWrapListArr);
    
    return jsonString;
}

// 지원 관련 input read only 처리 - 자기 자신 지원한 경우
function setApplyInputReadOnly(){

    $(".exampleText").hide();
    $(".updateModeText").show();
    $("#projectApplyProcess").html("프로젝트 수정 완료하기");

    // 도급,상주 구분
    if($("#projectWorkType").val()=='1'){
        $("#selectWrapDummy").hide();
        $("#selectWrapReal").hide();
    }else{
        $("#selectWrapReal").hide();
        $("#selectWrapDummy").show();
        $("#selectWrapDummy").find('.selectWrap').remove();//더미 지우고
    }
    $("#portFolioSelectDiv").html('');

    $("#projectApplyDuring").attr("readonly",true);
    $("#projectApplyCost").attr("readonly",true);
    $("#projectApplyText").attr("readonly",true);
    $(".issamejointRadioWrap>label").removeClass('on');
    $(".issamejointRadioLabel input").attr("readonly",true);

    $("#projectApplyDuring").css('background-color', '#eee');
    $("#projectApplyCost").css('background-color', '#eee');
    $("#projectApplyText").css('background-color', '#eee');
    $("#projectApplyDuring").parent('div').css('background-color', '#eee');
    $("#projectApplyCost").parent('div').css('background-color', '#eee');
    $("#projectApplyText").css('background-color', '#eee');

    //html태그 때문에 textarea에서 div로 대체
    $("#projectApplyText").css('display', 'none');
    $("#projectApplyText2").css('background-color', '#eee');
    $("#projectApplyText2").css('display', 'block');

    $("#projectApplyDuring").css('cursor', 'default');
    $("#projectApplyCost").css('cursor', 'default');
    $("#projectApplyText").css('cursor', 'default');
    $(".issamejointRadioLabel").removeClass('issamejointRadioLabel');

    $('.applyHistoryModalBtn').hide();
    $('.applyHistorySave').hide();
    $('.applyHistorySave>input').attr('value', 0);
    $(".applyCheckMsg").html('<b>!</b>지원서는 등록과 동시에 클라이언트 메일로 발송되었습니다. 포트폴리오만 수정 가능합니다.');
}

// 지원 관련 input read only remove 처리 - 자기 자신 지원 안한 경우
function setRemoveApplyInputReadOnly(){
    $(".issamejointRadioWrap>label").addClass('issamejointRadioLabel');
    $(".issamejointRadioWrap>label").removeClass('on');
    $(".issamejointRadioWrap input").prop('checked', false)
    // 그리고 들어 있는 값도 없애주기
    $(".exampleText").show();
    $(".updateModeText").hide();
    $("#projectApplyProcess").html("프로젝트 지원 완료하기");

    // 도급,상주 구분
    if($("#projectWorkType").val()=='1'){
        $("#selectWrapDummy").hide();
        $("#selectWrapReal").hide();
    }else{
        $("#selectWrapReal").show();
        $("#selectWrapReal").html('');
        $("#selectWrapDummy").find('.selectWrap').remove();//더미 지우고
        $("#selectWrapDummy").hide();
    }

    var htmlWrapReal = '';
    htmlWrapReal +='<h3>지원 금액</h3>';
    htmlWrapReal +='    <p class="exampleText">작업 기간과 투입인원을 토대로 진행 가능한 금액을 제안해주세요.</p>';
    htmlWrapReal +='    <div class="selectWrap">';
    htmlWrapReal +='        <div>';
    htmlWrapReal +='            <input type="hidden" name="resideTech0" value="" class="resideTech">';
    htmlWrapReal +='            <p><span>기술구분</span><b>▾</b></p>';
    htmlWrapReal +='            <div class="skillSlide">';
    htmlWrapReal +='                <p><span data-value="1">개발자</span></p>';
    htmlWrapReal +='                <p><span data-value="2">디자이너</span></p>';
    htmlWrapReal +='                <p><span data-value="3">기획자</span></p>';
    htmlWrapReal +='                <p><span data-value="4">기타 포지션</span></p>';
    htmlWrapReal +='            </div>';
    htmlWrapReal +='        </div>';
    htmlWrapReal +='        <div>';
    htmlWrapReal +='            <input type="hidden" name="resideCareer0" value="" class="resideCareer">';
    htmlWrapReal +='            <p><span>연차구분</span><b>▾</b></p>';
    htmlWrapReal +='            <div class="careerSlide">';
    htmlWrapReal +='                <p><span data-value="1">초급</span> (1년이상 ~ 5년미만)</p>';
    htmlWrapReal +='                <p><span data-value="2">중급</span>  (5년이상 ~ 10년미만)</p>';
    htmlWrapReal +='                <p><span data-value="3">고급</span> (10년이상)</p>';
    htmlWrapReal +='            </div>';
    htmlWrapReal +='        </div>';
    htmlWrapReal +='        <div>';
    htmlWrapReal +='            <input type="text"  name="residePerson0" placeholder="인원 수" class="residePerson" numberonly>';
    htmlWrapReal +='            <b>명</b>';
    htmlWrapReal +='        </div>';
    htmlWrapReal +='        <div>';
    htmlWrapReal +='            <input type="text"  name="residePay0" placeholder="임금" class="residePay" numberonly>';
    htmlWrapReal +='            <b>만원</b>';
    htmlWrapReal +='        </div>';
    htmlWrapReal +='        <p class="delStack">×</p>';
    htmlWrapReal +='    </div>';
    htmlWrapReal +='    <p class="appendStack">+ 추가</p>';
    htmlWrapReal +='    <span class="infoRed">* 인원 별 임금은 만원 단위로 기입하며 프리모아 이용 수수료는 클라이언트 및 파트너가 5%씩 부담합니다.</span>';
    htmlWrapReal +='</div>';

    $("#selectWrapReal").html(htmlWrapReal);
    
    var portHtml = '';
    portHtml += '    <input type="hidden" value="" class="pfnoHidden">';
    portHtml += '    <div class="portFolioAppend modalBtn_new" data-modal="projectPush">';
    portHtml += '        <div>+</div>';
    portHtml += '        <p>포트폴리오 추가하기</p>';
    portHtml += '    </div>';

    $("#portFolioSelectDiv").html(portHtml);

    $(".applyCheckMsg").html('<b>!</b>지원서는 등록 즉시 클라이언트에 메일로 발송되어 수정이 어렵습니다. 지원 내용을 다시 한번 꼼꼼히 확인해주세요.');

    $("#projectApplyDuring").val('');
    $("#projectApplyCost").val('');
    $("#projectApplyText").val('');

    $("#projectApplyDuring").css('background-color', '#fff');
    $("#projectApplyCost").css('background-color', '#fff');
    $("#projectApplyText").css('background-color', '#fff');

    $("#projectApplyDuring").attr("readonly",false);
    $("#projectApplyCost").attr("readonly",false);
    $("#projectApplyText").attr("readonly",false);

    $("#projectApplyDuring").css('cursor', 'default');
    $("#projectApplyCost").css('cursor', 'default');
    $("#projectApplyText").css('cursor', 'default');
}

$(function(){

    
    // 프로젝트 지원 프로세스
    $("#projectApplyViewHide").on('click', function()
    {
        $(".projectViewApplyHidenContens").show();
        $("#projectFreeTalkDiv").show();
        $("#projectViewMidMenuRecruitFreeTalk").show();
        $("#projectApplyWrap_new").hide();
        $("#projectApply").show();
        $('.projectViewMidMenu').show();
        window.scrollTo(0,0);
    });


    // 자세히 보기
    $(".resideDetailView").on('click', function(){
        // alert('자세히 보기');
        if($(this).hasClass("on")){
            $(this).html('내용 전체 보기 ▾');
            $(this).removeClass("on").addClass("off");
            $(".projectViewApplyHidenContens").hide();
            $('.projectViewMidMenu').hide();
            moveToApplyZone();
        }else{
            $(this).html('내용 닫기 ▴');
            $(this).removeClass("off").addClass("on");
            $(".projectViewApplyHidenContens").show();
            $('.projectViewMidMenu').show();
            window.scrollTo(0,0);
        }
    });

    $(document).on("keyup","input:text[numberonly]",function() {
        $(this).val($(this).val().replace(/[^0-9]/g,""));
    });
	$(document).on("click",".clipstarProjectDetail",function(e){
		var t=$(this);
        var star=$("#tmpPno").val();
        
		prs.aCall("/japda/clipstar2",{
			"star":star
		},function(r){
            // console.log(r);
            // t[(r.DATA)?"addClass":"removeClass"]("on");
            if(!r.DATA){
                t.html('<svg width="20" height="18" viewBox="0 0 20 18"><path style="fill:#aaa" d="M-3779.152,2662.781a1.164,1.164,0,0,1-.773-.294c-.808-.715-1.587-1.386-2.274-1.979l0,0a42.5,42.5,0,0,1-4.965-4.715,7.577,7.577,0,0,1-1.984-4.929,6.367,6.367,0,0,1,1.586-4.318,5.35,5.35,0,0,1,4-1.762,4.994,4.994,0,0,1,3.142,1.1,6.457,6.457,0,0,1,1.271,1.342,6.462,6.462,0,0,1,1.271-1.342,4.994,4.994,0,0,1,3.142-1.1,5.35,5.35,0,0,1,4,1.762,6.367,6.367,0,0,1,1.586,4.318,7.578,7.578,0,0,1-1.984,4.929,42.533,42.533,0,0,1-4.965,4.715c-.689.593-1.469,1.266-2.279,1.982A1.167,1.167,0,0,1-3779.152,2662.781Zm-4.413-16.815a4.2,4.2,0,0,0-3.14,1.38,5.179,5.179,0,0,0-1.276,3.515,6.376,6.376,0,0,0,1.714,4.173,41.784,41.784,0,0,0,4.823,4.569l0,0c.689.594,1.472,1.269,2.285,1.989.819-.721,1.6-1.4,2.294-1.993a41.8,41.8,0,0,0,4.823-4.568,6.376,6.376,0,0,0,1.714-4.173,5.18,5.18,0,0,0-1.276-3.515,4.2,4.2,0,0,0-3.14-1.38,3.855,3.855,0,0,0-2.426.85,5.727,5.727,0,0,0-1.352,1.583.733.733,0,0,1-.635.365.732.732,0,0,1-.635-.365,5.73,5.73,0,0,0-1.352-1.583A3.855,3.855,0,0,0-3783.565,2645.966Z" transform="translate(3789.152 -2644.781)"></path></svg> 관심 프로젝트 지정');
            }else{
                t.html('<svg width="20" height="18" viewBox="0 0 20 18"><path style="fill:#ff4747" d="M-3779.152,2662.781a1.163,1.163,0,0,1-.773-.294c-.808-.715-1.587-1.386-2.274-1.979l0,0a42.445,42.445,0,0,1-4.965-4.715,7.578,7.578,0,0,1-1.984-4.929,6.364,6.364,0,0,1,1.586-4.318,5.351,5.351,0,0,1,4-1.762,4.994,4.994,0,0,1,3.142,1.1,6.446,6.446,0,0,1,1.271,1.343,6.482,6.482,0,0,1,1.27-1.343,5,5,0,0,1,3.143-1.1,5.351,5.351,0,0,1,4,1.762,6.367,6.367,0,0,1,1.586,4.318,7.578,7.578,0,0,1-1.984,4.929,42.545,42.545,0,0,1-4.964,4.715c-.689.593-1.469,1.266-2.279,1.982A1.167,1.167,0,0,1-3779.152,2662.781Z" transform="translate(3789.152 -2644.781)"></path></svg> 관심 프로젝트');
            }
		});
    });
    
    function replaceAll(str, searchStr, replaceStr) {
        return str.split(searchStr).join(replaceStr);
    }

    // 프로젝트 지원
    $('#projectApply').on('click', function () {

        $("#projectApply").hide();

        if($('#sdnofasdbniobnasdiovbioasddsfsdbvioasdbviobasiofbos').val() != ''){

            // 프리톡 감추고
            $("#projectFreeTalkDiv").hide();
            $("#projectViewMidMenuRecruitFreeTalk").hide();
            
            // 포트폴리오 갱신하고
            getPorfolio();

            if($(this).hasClass("apply")){
                setRemoveApplyInputReadOnly();
                $('#projectApplyWrap_new').show();
                $('.applyHistoryModalBtn').show();
                $('.applyHistorySave').show();
                $('.applyHistorySave>input').attr('value', 0);
            }else if($(this).hasClass("applyComplete")){
                setApplyInputReadOnly();
                // 데이터 가져와서 뿌려주기
                var applypno = pj.getPno();
                prs.aCall("/m4a/getApplyInfo",{
                    pno: applypno,
                },function(r){
                    if(r.DATA){
                        var detail_txt_replace = replaceAll(r.DATA.row_applicate.detail_txt, "????", "");
                        $("#projectApplyDuring").val(r.DATA.row_applicate.during_for_free);
                        $("#projectApplyCost").val(r.DATA.row_applicate.cost_for_free);
                        $("#projectApplyText").val(detail_txt_replace);
                        $("#projectApplyText2").html(detail_txt_replace);
                        if(r.DATA.row_applicate.issameprojectjoint == 1) {
                            $('.issamejointRadioWrap .radioBtn').eq(0).addClass('on')
                        } else {
                            $('.issamejointRadioWrap .radioBtn').eq(1).addClass('on')

                        }
                        // 상주 인경우 데이터 넣어주기
                        var stayInfoObj = JSON.parse(r.DATA.row_applicate.stayInfoList);
                        var stayInfoHtml = '';

                        if(stayInfoObj!=null){
                             // 타입 정의
                            var techTypeArr = {'1':'개발자', '2':'디자이너', '3':'기획자','4':'기타포지션'};
                            var careerTypeArr = {'1':'초급', '2':'중급', '3':'고급'};
                            for (var i = 0 ; i < stayInfoObj.length; i ++){
                                var itemObj = stayInfoObj[i];
                                stayInfoHtml += '<div class="selectWrap">';
                                stayInfoHtml += '<div>';
                                stayInfoHtml += '    <input type="hidden" name="resideTech0" value="" class="resideTech">';
                                stayInfoHtml += '    <p class="off"><span>'+techTypeArr[itemObj.resideTech]+'</span></p>';
                                stayInfoHtml += '</div>';
                                stayInfoHtml += '<div>';
                                stayInfoHtml += '    <input type="hidden" name="resideCareer0" value="" class="resideCareer">';
                                stayInfoHtml += '    <p class="off"><span>'+careerTypeArr[itemObj.resideCareer]+'</span></p>';
                                stayInfoHtml += '</div>';
                                stayInfoHtml += '<div class="off">';
                                stayInfoHtml += '    <input type="text"  name="residePerson0" class="residePerson" readonly>';
                                stayInfoHtml += '    <b>'+itemObj.residePerson+'명</b>';
                                stayInfoHtml += '</div>';
                                stayInfoHtml += '<div class="off">';
                                stayInfoHtml += '    <input type="text"  name="residePay0" class="residePay" readonly>';
                                stayInfoHtml += '    <b>'+itemObj.residePay+'만원</b>';
                                stayInfoHtml += '</div>';
                                stayInfoHtml += '</div>';
                            }

                            $("#selectWrapDummy").append(stayInfoHtml);
                        }else{
                            $("#selectWrapDummy").html('');
                        }

                       

                        //포트폴리오 정보 넣기
                        var portHtml = '';
                        // console.log(r.DATA.reference_portfolio_list);

                        $.each(r.DATA.reference_portfolio_list, function (key, row) {
                            portHtml += '<div class="portFolioList" data-pfno="'+row.pf_idx+'">    <div>        ';
                            if(row.VIDEO.length!=0){
                                portHtml += '<iframe src="'+row.VIDEO[0].link+'" style="height:300px;witdh:100%"></iframe>';
                            }else{
                                if(row.IMAGES.length!=0)
                                    portHtml += '    <img src="'+row.PORTFOLIO_URL+'/'+row.IMAGES[0].img_idx+'-224-165-1" alt="">        ';
                            }
                            portHtml += '    <p>×</p>    </div>    ';
                            portHtml += '    <p>'+htmlspecialchars(row.title)+'</p>';
                            portHtml += '</div>';
                        });


                        // for (var i = 0 ; i < r.DATA.reference_portfolio_list.length; i ++){
                        //     var itemObj = r.DATA.reference_portfolio_list[i];
                        //     portHtml += '<div class="portFolioList" data-pfno="'+itemObj.pf_idx+'">    <div>        ';
                        //     if(itemObj.IMAGES.lenght>0){
                        //         portHtml += '    <img src="'+itemObj.PORTFOLIO_URL+'/'+itemObj.IMAGES[0].img_idx+'-224-165-1" alt="">        ';
                        //         // portHtml += '    <img src="'+itemObj.PORTFOLIO_URL+'-224-165-1" alt="">        ';
                        //     }else{
                        //         // portHtml += '    <img src="'+itemObj.PORTFOLIO_URL+'/'+itemObj.IMAGES[0].img_idx+'-224-165-1" alt="">        ';
                        //         // portHtml += '<iframe src="'+itemObj.VIDEO[0]+'" style="height:300px;witdh:100%"></iframe>';
                        //     }
                        //     portHtml += '    <p>×</p>    </div>    ';
                        //     portHtml += '    <p>'+htmlspecialchars(itemObj.title)+'</p>';
                        //     portHtml += '</div>';
                        // }

                        portHtml += '    <input type="hidden" value="" class="pfnoHidden">';
                        portHtml += '    <div class="portFolioAppend modalBtn_new" data-modal="projectPush">';
                        portHtml += '        <div>+</div>';
                        portHtml += '        <p>포트폴리오 추가하기</p>';
                        portHtml += '    </div>';
                        $(".portFolioSelect").append(portHtml);


                    }else{
                        alert(r.ERROR.MSG);
                    }
                });

                $('#projectApplyWrap_new').show();
            }
            $(".resideDetailView").removeClass("off").addClass("on").click();

        }else{
            if(confirm('로그인 후 사용 가능 합니다.')){
				/*var go_url = setUri("/m0/s02"+getUri());*/
                window.location.href='/m0/s02'+getUri();
            }else{
                set_cookie('prj_filter_check', '', 17520);
                $("#filtersave").prop('checked',false);
                $("#filtersave_label2").removeClass("on");
			}
        }
    });


    // 프로젝트 지원 프로세스
    $("#projectApplyProcess").on('click', function()
    {

        if($("#projectApply").hasClass("apply")){
            var applypno = pj.getPno();
            var applytitle = '';
            
            var applyduring = $("#projectApplyDuring").val();
            var applycost = $("#projectApplyCost").val().split(",").join("");
            var applytext =  $("#projectApplyText").val();
            var applySave =  $("#applySaveCheckBox").val();

            //applytext = applytext.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|[\u2694-\u2697]|[\u2580-\u27BF]|\uD83E[\uDD10-\uDD5D]|\uD83E[\uDD10-\uDDFF])/g, '');

            // 포트폴리오 정보 가져오기
            var checkedPortFolio = $(".portFolioSelect").find('.portFolioList');
            var portFolioArr = []
            for(i=0; i<checkedPortFolio.length; i++) {
                portFolioArr.push(checkedPortFolio.eq(i).attr('data-pfno'));
            }

            

            // 유효성 검사

            if($("#projectWorkType").val()=='1'){
                if($("#projectApplyDuring").val()==''){alert('지원기간을 입력해주세요.'); $("#projectApplyDuring").focus(); return false;}
                if($("#projectApplyCost").val()==''){alert('지원금액을 입력해주세요.'); $("#projectApplyCost").focus(); return false;}
                if($("#projectApplyText").val()==''){alert('지원내용을 입력해주세요.'); $("#projectApplyText").focus(); return false;}
                
                if(Number($("#projectApplyDuring").val())>1000){
                    alert('기간은 1000일이 넘을수 없습니다.');
                    $("#projectApplyDuring").focus();
                    return false;
                }

                if(Number(applycost)>100000){
                    alert('지원 금액은 10억이 넘을수 없습니다.');
                    $("#projectApplyCost").focus();
                    return false;
                }
            }


            // 상주 정보 가져오기 , 상주 프로젝트인 경우
            var stayInfoList = getStayInfoList();
            if($("#projectWorkType").val()!='1'){

                if($("#projectApplyText").val()==''){alert('지원내용을 입력해주세요.'); $("#projectApplyText").focus(); return false;}

                if(!stayInfoList){
                    moveToDiv("selectWrapReal");
                    alert('상주 프로젝트는 상주 금액 데이터 필수 입니다.')
                    return false;
                }
            }
            var issamejoint_ = $('.issamejointRadioLabel>input:checked').val();
            // console.log(issamejoint_)
            if(issamejoint_ == undefined){
                alert('유사 프로젝트 진행경험을 선택해주세요.');
                return false; 
            }
            
            
            prs.aCall("/m4a/apply",{
                pno: applypno,
                title: '',
                cost: applycost,
                during: applyduring,
                txt: applytext,
                issave: applySave,
                issamejoint: issamejoint_,
                'stayInfoList' : stayInfoList,
                'protfolio[]': portFolioArr.join(',')
            },function(r){
                if(r.DATA){
                    alert('지원 완료 되었습니다.');
                    location.reload();
                }else{
                    alert(r.ERROR.MSG);
                }
            });
        }else{
            var applypno = pj.getPno();
            var applytitle = '';
            
            var applyduring = $("#projectApplyDuring").val();
            var applycost = $("#projectApplyCost").val();
            var applytext =  $("#projectApplyText").val();

            // 포트폴리오 정보 가져오기
            var checkedPortFolio = $(".portFolioSelect").find('.portFolioList');
            var portFolioArr = []
            for(i=0; i<checkedPortFolio.length; i++) {
                portFolioArr.push(checkedPortFolio.eq(i).attr('data-pfno'));
            }

            prs.aCall("/m4a/applyUpdate",{
                pno: applypno,
                'protfolio[]': portFolioArr.join(',')
            },function(r){
                if(r.DATA){
                    alert('지원 수정 완료 되었습니다.');
                    location.reload();
                }else{
                    alert(r.ERROR.MSG);
                }
            });
        }
    });

    if ($("#projectViewWrap").data("first-pno")){
        pj.setPno($("#projectViewWrap").data("first-pno"));
        pj.setAnyView($("#projectViewWrap").data("anyView"));
        pj.getView();

    }
    else{
        var initPageNum=1;
        if (SITE_URL_METHOD=='pc'){
            initPageNum=$("#projectPagination > a").first().attr("data-pagenum");
        }
        else{
            initPageNum=$("#projectPagination > li > a").first().attr("data-pagenum")
        }

        pj.getList(initPageNum); //맨처음리스트 가져오기
        $("#projectListWrap").show();
        // 프로젝트 목록에서는 상단 검색배너 노출시킴_210316bySOON
        // $(".projectHeadSearchWrap").show();
    }


    $('#filtersave_label2').on('click', function () {
        if($('#sdnofasdbniobnasdiovbioasddsfsdbvioasdbviobasiofbos').val() != ''){

        }else{
            if(confirm('로그인 후 사용 가능 합니다.')){
				/*var go_url = setUri("/m0/s02"+getUri());*/
                window.location.href='/m0/s02'+getUri();
                return false;
            }else{
                set_cookie('prj_filter_check', '', 17520);
                $("#filtersave").prop('checked',false);
                $("#filtersave_label2").removeClass("on");
                $("#filtersave").removeClass("on");
                return false;
			}
        }

    });

    if($.cookie('prj_filter_check')=='check'){
        $('#filtersave').attr('checked','checked');
        $('#filtersave_label2').addClass('on');
    }



    $("#filtersave").change(function() {
        var filter_part = [];
        var filter_during =  (($('.duringRadio.on').data('during-min')) ? $('.duringRadio.on').data('during-min') : " ")+"-"+  (($('.duringRadio.on').data('during-max')) ? $('.duringRadio.on').data('during-max') : " ");
        var filter_cost = (($('.costRadio.on').data('cost-min')) ? $('.costRadio.on').data('cost-min') : " ")+"-"+  (($('.costRadio.on').data('cost-max')) ? $('.costRadio.on').data('cost-max') : " ");
        var filter_test = "";
        var filter_loc = '';
        var filter_fnd2 = '';
        var filter_stay = $('.stayRadio.on').data('stay-value');
        var filter_stay2='';
        var filter_stay3='';
        var filter_sort='';
        if($(".default_radio ").hasClass("on")){
            filter_sort='0';
        }else{
            filter_sort= $(".sortingRadio:checked").attr('data-sorting-mode');
        }
        if(filter_stay == "stayExcept"){
            if($("#type-chk01").is(":checked")===true && $("#type-chk02").is(":checked")===true){
                filter_stay2 = '2';
            }else if($("#type-chk01").is(":checked")===true){
                filter_stay2 = '0';
            }else if($("#type-chk02").is(":checked")===true){
                filter_stay2 = '1';
            }
            
        }else if(filter_stay == "stayView"){
            if($("#range-chk01").is(":checked")===true && $("#range-chk02").is(":checked")===true){
                filter_stay3 = '2';
            }else if($("#range-chk01").is(":checked")===true){
                filter_stay3 = '0';
            }else if($("#range-chk02").is(":checked")===true){
                filter_stay3= '1';
            }
            
        }else{
            filter_stay2='';
            filter_stay3='';
        }

        $(".locCheck:checked").each(function(){
            filter_loc = filter_loc + $(this).val() +"-";
        })
        $(".fnd2Check:checked").each(function(){
            filter_fnd2 = filter_fnd2 + $(this).val() +"-";
        });
        $(".filteringRadio:checked").each(function(){
        
                filter_part.push($(this).data("value"));
        });
        if(this.checked) {
            set_cookie('prj_filter_check', 'check', 17520);
            set_cookie('prj_filter_part',filter_part,17520);
            //set_cookie('prj_filter_during',filter_during,17520);
            //set_cookie('prj_filter_cost',filter_cost,17520);
            set_cookie('prj_filter_loc',filter_loc,17520);
            set_cookie('prj_filter_stay',filter_stay,17520);
            set_cookie('prj_filter_stay2',filter_stay2,17520);
            set_cookie('prj_filter_stay3',filter_stay3,17520);
            set_cookie('prj_filter_sort',filter_sort,17520);
            //set_cookie('prj_filter_fnd2',filter_data,17520);
        }else {
            set_cookie('prj_filter_check', '', 17520);
            set_cookie('prj_filter_part','',17520);
            //set_cookie('prj_filter_during','',17520);
            //set_cookie('prj_filter_cost','',17520);
            set_cookie('prj_filter_loc','',17520);
            set_cookie('prj_filter_stay','',17520);
            set_cookie('prj_filter_stay2','',17520);
            set_cookie('prj_filter_stay3','',17520);
            set_cookie('prj_filter_sort','',17520);
            //set_cookie('prj_filter_fnd2','',17520);
        
        }

    });

    $(".filteringRadio").click(function(){
        
        var filteringRadio = [];
        if($(this).hasClass("on")){
            $(this).removeClass("on");
            $(this).prop("checked",false);
            // var parnet = $(this).closest("ul");
            // $(parnet).find("li").eq(0).addClass("on"); 
            // $(".speciality-low").removeClass("on");
        }else{
            //$(".filteringRadio").removeClass("on");
         
            var dataValue = $(this).data('value');
            $(this).addClass("on");
            $(this).prop("checked",true);
           
            if( dataValue != getParameters('f')){
                $(".fnd2Check").each(function(){
                    $(this).removeClass('on');
                    $(this).prop('checked',false);
                });
                set_cookie('prj_filter_fnd2','',17520);
            }
            if(dataValue != ''){
    
                $('.speciality-low').addClass('on');
                $(".fnd2_item").each(function(){
                    $(this).css('display','inline-block');
                    if(dataValue != $(this).data('parent-value')){
                        $(this).css('display','none');
                    }
                });
            }else{
                $('.speciality-low').removeClass('on');
            }
        }
        $(".filteringRadio:checked").each(function(){
         
            filteringRadio.push($(this).data("value"));
        });
  

        if($.cookie('prj_filter_check') == 'check'){
            set_cookie('prj_filter_part',filteringRadio,17520);
        }

        pj.getList();
    });

    $("#projectListNew").on("click",".projectInfo",function(){
        var openYn = 'N';
        if(open == 0){
            $.ajax({
				type:"post",
				url:"/m4a/openYnCheck",
				data:"pno=" + pno + "&fno=" +fno,
                dataType:"json",
                async:false,
				success:function(r){
					if(r.DATA.cnt == '0') {
                        openYn = 'Y';
                    }
				}
			});
        }

        if(openYn == 'Y'){
            alert('클라이언트에게 견적 요청을 받은\n개별 파트너만 열람 및 지원 가능합니다.');
            return;
        }
        var cookie_view_prj =$.cookie('view-prj');
        var set_cookie_pno = '';
        if(cookie_view_prj){
            var set_pno = $(this).attr("data-pno");

            if(cookie_view_prj.indexOf(set_pno+'-') !== 0){
                set_cookie_pno = cookie_view_prj + set_pno +"-";
                set_cookie('view-prj',set_cookie_pno,6);
            }

        }else{
            set_cookie_pno =  $(this).attr("data-pno") +"-";
            set_cookie('view-prj',set_cookie_pno,6);
        }
    });



    $(".duringRadio").click(function(){
        if($(this).hasClass("on")){
            $(".duringRadio").removeClass("on");
            var parnet = $(this).closest("ul");
            $(parnet).find("li").eq(0).addClass("on"); 
        }else{
            $(".duringRadio").removeClass("on");
            $(this).addClass("on");
        }
        if($.cookie('prj_filter_check') == 'check'){
            var filter_data = (($(this).data('during-min')) ? $(this).data('during-min') : " ")+"-"+  (($(this).data('during-max')) ? $(this).data('during-max') : " ");
            //set_cookie('prj_filter_during',filter_data,17520);
        }
        pj.getList();
    });

    $(".costRadio").click(function(){
        if($(this).hasClass("on")){
            $(".costRadio").removeClass("on");
            var parnet = $(this).closest("ul");
            $(parnet).find("li").eq(0).addClass("on"); 
        }else{
            $(".costRadio").removeClass("on");
            $(this).addClass("on");
        }
        if($.cookie('prj_filter_check') == 'check'){
            var filter_data = (($(this).data('cost-min')) ? $(this).data('cost-min') : " ")+"-"+  (($(this).data('cost-max')) ? $(this).data('cost-max') : " ");
            //set_cookie('prj_filter_cost',filter_data,17520);
        }
        pj.getList();
    });
    $(".stayRadio").click(function () {
        $(".stayRadio").removeClass("on");
        $(this).addClass("on");
        // if($(this).hasClass("on")){
        //     $(".stayRadio").removeClass("on");
        //     var parnet = $(this).closest("ul");
        //     $(parnet).find("li").eq(0).addClass("on"); 
        // }else{
        //     $(".stayRadio").removeClass("on");
        //     $(this).addClass("on");
        // }
        if($(".stayRadio.on").attr("data-stay-value") == "stayExcept"){
            $("#type-chk01").prop("checked",true);
            $("#type-chk02").prop("checked",true); 
        }else{
            $("#range-chk01").prop("checked",true);
            $("#range-chk02").prop("checked",true);           
        }
        if($.cookie('prj_filter_check') == 'check'){
            set_cookie('prj_filter_stay',$(this).attr("data-stay-value"),17520);
        }
        pj.getList();
    });
    $(".workType").click(function () {
        if( $("#type-chk01").is(":checked") !== true && $("#type-chk02").is(":checked") !== true ){
            $("#type-chk01").prop("checked",true);
            $("#type-chk02").prop("checked",true); 
        }

        if($.cookie('prj_filter_check') == 'check'){
            set_cookie('prj_filter_stay',$(this).attr("data-stay-value"),17520);
        }
        pj.getList();
    });
    $(".workType2").click(function () {
        if( $("#range-chk01").is(":checked") !== true && $("#range-chk02").is(":checked") !== true ){
            $("#range-chk01").prop("checked",true);
            $("#range-chk02").prop("checked",true); 
        }
        if($.cookie('prj_filter_check') == 'check'){
            set_cookie('prj_filter_stay',$(this).attr("data-stay-value"),17520);
        }
        pj.getList();
    });
    $(".locCheck").change(function () {
        $(this).toggleClass("on");
        if($.cookie('prj_filter_check') == 'check'){
 			  var filter_data ="";
            $(".locCheck").each(function(){
                /*filter_data = filter_data + $(this).val() +"-";*/

                var value = $(this).val();
                if($(this).hasClass('on')){
                    filter_data = filter_data + value +"-";
				}
            });
            set_cookie('prj_filter_loc',filter_data,17520);
        }
        pj.getList();
    });

    $(".fnd2Check").change(function () {
        $(this).toggleClass("on");
        if($.cookie('prj_filter_check') == 'check'){
            var filter_data ="";
            $(".fnd2Check").each(function(){
                /*filter_data = filter_data + $(this).val() +"-";*/

                var value = $(this).val();
                if($(this).hasClass('on')){
                    filter_data = filter_data + value +"-";
                }
            });
            set_cookie('prj_filter_fnd2',filter_data,17520);
        }
        pj.getList();
    });

//--------- 모바일 시작 ------------

    var prjFilter = {
        fldList : [],
        prjDuring : [],
        prjCost : [],
        st : [],
        pv : []
    };

    $(".filteringRadioM").click(function(){
        // $(".filteringRadioM").removeClass("on");
        // $(this).addClass("on");
        if($(this).hasClass('on')){
            $(this).removeClass("on");
        }else{
            $(this).addClass("on");
        }
        filterList('f');
    });
    $(".costRadioM").click(function(){
        $(this).toggleClass("on");
        if($('.costRadioM').length == $('.costRadioM.on').length){
            $('.costAll').addClass('on');
            filterList('costAll');
        }else{
            $('.costAll').removeClass('on');
            filterList('cost');
        }
    });
    $('.costAll').on('click', function () {
        if($(this).hasClass('on')) {
            $(".costRadioM").removeClass("on");
            $(this).removeClass("on");
        }else{
            $(".costRadioM").addClass("on");
            $(this).addClass("on");
        }
        filterList('costAll');
    });
    $(".ragneRadioM").click(function(){
        $(this).toggleClass("on");
        if($('.ragneRadioM').length == $('.ragneRadioM.on').length){
            $('.ragneAll').addClass('on');
            filterList('duringAll');
        }else{
            $('.ragneAll').removeClass('on');
            filterList('during');
        }
    });
    $('.ragneAll').on('click', function () {
        if($(this).hasClass('on')) {
            $(".ragneRadioM").removeClass("on");
            $(this).removeClass("on");
        }else{
            $(".ragneRadioM").addClass("on");
            $(this).addClass("on");
        }
        filterList('duringAll');
    });
    $(".locCheckM").change(function () {
        filterList('loc');
    });
    $('.allChk').on('click', function () {
        $('.filter_table').find('li').removeClass('on');
        $('.filter_table').find('input[type=checkbox]').attr('checked', false);
        $('#filter-list').empty();
        pj.getList();
        $('#prj-filter').modal('hide');
        filterList();
    });

	$(".stayRadioM").click(function(){
		if($(this).hasClass('on')){
            $(this).removeClass("on");
        }else{
            $(this).addClass("on");
        }
        filterList('st');
    });





    $('#modal-filter').on('click', function () {
        pj.getList();
        $('#prj-filter').modal('hide');
    });

    $(document).on('click', '.filter-close', function () {
        var type = $(this).parent().data('type');
        var closer = $(this).parent('li');
        closer.remove();

        if(type == 'f'){
            var value = closer.data('value');
			$('.filteringRadioM[data-value="'+value+'"]').removeClass('on');
            filterList('f');
        }else if(type == 'during'){
            var duringMin = closer.data('duringMin');
            var duringMax = closer.data('duringMax');
            $(".ragneRadioM[data-during-min='"+duringMin+"'][data-during-max='"+duringMax+"']").removeClass('on');
            filterList('during');
        }else if(type == 'duringAll'){
            $('.ragneRadioM').removeClass('on');
            $('.ragneAll').removeClass('on');
            filterList('duringAll');
        }else if(type == 'cost'){
            var costMin = closer.data('costMin');
            var costMax = closer.data('costMax');
            $(".costRadioM[data-cost-min='"+costMin+"'][data-cost-max='"+costMax+"']").removeClass('on');
            filterList('cost');
        }else if(type == 'costAll'){
            $('.costRadioM').removeClass('on');
            $('.costAll').removeClass('on');
            filterList('costAll');
        }else if(type == 'st'){
            var value = closer.data('stay-value');
            $('.stayRadioM[data-stay-value="'+value+'"]').removeClass('on');
            filterList('st');
		}else if(type == 'loc'){
            var value = closer.data('value');
            $(".locCheckM[value='"+value+"']").removeAttr('checked');
            filterList('loc');
        }
    });


    function filterList(type) {
        var html = '';

        if(type == 'f'){
            prjFilter.fldList = [];
            $(".filteringRadioM.on").each(function(){
                prjFilter.fldList.push({
                    value : $(this).data('value'),
                    class : 'filteringRadioM',
                    title : $(this).text(),
                    type : 'f'
                })
            });
            // prjFilter.fldList = fldList;
        }else if(type == 'during'){
            prjFilter.prjDuring = [];
            $(".ragneRadioM.on").each(function(){
                prjFilter.prjDuring.push({
                    min : $(this).data('duringMin'),
                    max : $(this).data('duringMax'),
                    class : 'ragneRadioM',
                    title : $(this).text(),
                    type : 'during'
                })
            });
        }else if(type == 'duringAll'){
            if($('.ragneAll').hasClass('on')){
                prjFilter.prjDuring = [];
                prjFilter.prjDuring.push({
                    min : 'all',
                    max : 'all',
                    class : 'ragneAll',
                    title : '작업 기간 전체',
                    type : 'duringAll'
                })
            }else{
                prjFilter.prjDuring = [];
            }
        }else if(type == 'cost'){
            prjFilter.prjCost = [];
            $(".costRadioM.on").each(function(){
                prjFilter.prjCost.push({
                    min : $(this).data('costMin'),
                    max : $(this).data('costMax'),
                    class : 'costRadioM',
                    title : $(this).text(),
                    type : 'cost'
                })
            });
        }else if(type == 'costAll'){
            if($('.costAll').hasClass('on')){
                prjFilter.prjCost = [];
                prjFilter.prjCost.push({
                    min : 'all',
                    max : 'all',
                    class : 'costAll',
                    title : '작업 금액 전체',
                    type : 'costAll'
                })
            }else{
                prjFilter.prjCost = [];
            }
        }else if(type == 'loc'){
            prjFilter.pv = [];
            $(".locCheckM:checked").each(function(val, idx){
                var label = $('.locCheckMLabel[for='+$(this).attr('id')+']').text();
                prjFilter.pv.push({
                    id : $(this).attr('id'),
                    value : $(this).val(),
                    class : 'locCheckM',
                    title : label,
                    type : 'loc'
                });
            });
        }else if(type == 'st'){
            prjFilter.st = [];
            $(".stayRadioM.on").each(function(){
                prjFilter.st.push({
                    value : $(this).data('stay-value'),
                    class : 'stayRadioM',
                    title : $(this).text(),
                    type : 'st'
                })
            });
        }else {
            prjFilter = {
                fldList : [],
                st : [],
                prjDuring : [],
                prjCost : [],
                pv : []
            };
        }

        if(prjFilter.fldList.length > 0){
            _.each(prjFilter.fldList, function (val, idx) {
                html +=
                    '<li data-value="' + val.value + '" data-type="'+val.type+'">' +
                    '	<div class="filter-txt">' + val.title + '</div>' +
                    '	<div class="filter-close">' +
                    '		<img class="close-filter" src="/public/img/dgmong/close-icon.png" width="10px" height="10px">' +
                    '	</div>' +
                    '</li>'
            });
        }
		if(prjFilter.st.length > 0){
            _.each(prjFilter.st, function (val, idx) {
                html +=
                    '<li data-stay-value="' + val.value + '" data-type="'+val.type+'">' +
                    '	<div class="filter-txt">' + val.title + '</div>' +
                    '	<div class="filter-close">' +
                    '		<img class="close-filter" src="/public/img/dgmong/close-icon.png" width="10px" height="10px">' +
                    '	</div>' +
                    '</li>'
            });
        }
        if(prjFilter.prjDuring.length > 0){
            _.each(prjFilter.prjDuring, function (val, idx) {
                html +=
                    '<li data-during-min="' + val.min + '" data-during-max="' + val.max + '" data-type="'+val.type+'">' +
                    '	<div class="filter-txt">' + val.title + '</div>' +
                    '	<div class="filter-close">' +
                    '		<img class="close-filter" src="/public/img/dgmong/close-icon.png" width="10px" height="10px">' +
                    '	</div>' +
                    '</li>'
            });
        }
        if(prjFilter.prjCost.length > 0){
            _.each(prjFilter.prjCost, function (val, idx) {
                html +=
                    '<li data-cost-min="' + val.min + '" data-cost-max="' + val.max + '" data-type="'+val.type+'">' +
                    '	<div class="filter-txt">' + val.title + '</div>' +
                    '	<div class="filter-close">' +
                    '		<img class="close-filter" src="/public/img/dgmong/close-icon.png" width="10px" height="10px">' +
                    '	</div>' +
                    '</li>'
            });
        }
        if(prjFilter.pv.length > 0){
            _.each(prjFilter.pv, function (val, idx) {
                html +=
                    '<li data-id="'+val.id+'" data-value="'+val.value+'" data-type="' + val.type + '">' +
                    '	<div class="filter-txt">'+val.title+'</div>' +
                    '	<div class="filter-close">' +
                    '		<img class="close-filter" src="/public/img/dgmong/close-icon.png" width="10px" height="10px">' +
                    '	</div>' +
                    '</li>'
            });
        }

        $('#filter-list').empty().append(html);
    }

    $(".default_radio").click(function(){
        $(".sortingRadio").removeClass("on");
        $(this).addClass("on");
        pj.getList();
    });

    $(".sortingRadio").click(function(){
        // if (SITE_URL_METHOD=='pc'){
        // var ison=$(this).filter(".on").length;
        $(".sortingRadio").removeClass("on");
        $(".default_radio").removeClass("on")
        //if (ison==0)
        $(this).addClass("on");

        // }else{
        // 	var ison=$(this).parent('li').filter(".active").length;
        // 	$(".sortingRadio").parent('li').removeClass("active");
        //
        // 	if (ison==0) $(this).parent('li').addClass("active");
        // }
        pj.getList();
    });

    $(document).on('click','.lst-sch-bar',function () {
        $('.filter-search-wrap').slideToggle('fast');
    });
    $("#closeSearchBtn").on('click', function () {
        $("#projectSearchStringInput").val('');
    });
    $("#projectSearchStringInput").keyup(function(e){
        if (e.which==13){
            pj.getList();
        }
    });

    $(".dgm-popup .tab_content").hide();
    $(".dgm-popup .tab_content").eq(0).show();
    $(".dgm-popup ul.tabs li").eq(0).addClass("active");
    $(".dgm-popup ul.tabs li").click(function () {
        $("#blockBackgroundWhite").show().delay(200).hide(0);
        var activeTab = $(this).attr("rel");
        $(".dgm-popup ul.tabs li").removeClass("active");
        $(this).addClass("active");
        $(".tab_content").hide();
        $("#" + activeTab).show();
    });

    $("#projectSearchBtn").click(function(){
        pj.getList();
    });

    $("#prjFilter").on('click', function () {
        $('#prj-filter').modal('show')
    });

    $("#modal-cancel").on('click', function () {
        $('#prj-filter').modal('hide')
    });


    if (SITE_URL_METHOD=='pc'){
        $("#projectPagination").on("click",">a",function(){
            pj.getList($(this).attr("data-pagenum"));
        });
    }
    else{
        $("#projectPagination").on("click",">li>a.pageGoBtn",function(){
            pj.getList($(this).attr("data-pagenum"));
        });
    }



    $("#projectListNew").on("click",".projectInfo",function(){
        var open = $(this).attr('valid.open');
        var pno=$(this).attr("data-pno");
        var fno=$("#projectListNew").attr("data-fno");

        var openYn = 'N';
        if(open == 0){
            $.ajax({
				type:"post",
				url:"/m4a/openYnCheck",
				data:"pno=" + pno + "&fno=" +fno,
                dataType:"json",
                async:false,
				success:function(r){
					if(r.DATA.cnt == '0') {
                        openYn = 'Y';
                    }
				}
			});
        }

        if(openYn == 'Y'){
            alert('클라이언트에게 견적 요청을 받은\n개별 파트너만 열람 및 지원 가능합니다.');
            return;
        }

        var scrollHeightPosition = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop; 
        s41setCookie("category", "myCategory");// 쿠키에 내용을 정의하는 사용자 정의 함수 
        s41setCookie("scroll_position", scrollHeightPosition); // 쿠키에 내용을 정의하는 사용자 정의 함수 
        
        var get=location.search.substr(1).split("&");
        var page=1;
        $.each (get, function(key, paramString){
            var kAndValue=paramString.split("=");
            if (kAndValue[0]=="page"){
                page=kAndValue[1];
                return false;
            }
        });

        location.href = "/m4/s41?page="+page+"&pno="+pno+"&first_pno="+pno+" ";
        return;

        pj.setPno(pno);
        pj.getView();
        if($(document).find('#need-profile').length){
            $('#need-profile').modal('show');
        }
        $("#apply_project").attr("href","/m4/project_apply?fno="+fno+"&pno="+pno);
        $("#apply_project2").attr("href","/m4/project_apply?fno="+fno+"&pno="+pno);
    });

    $('.no-need-profile').on('click', function () {
        $('#need-profile').modal('hide');
    });

    $("#goProjectListBtn").click(function(){
        if (SITE_URL_METHOD=='mobile') {
            var startFreetalk = $('#projectViewFreetalkView').data('freetalk');
            if(startFreetalk) {
                location.href="/m5/s58";
                return false;
            }
        }

        $("#projectViewWrap").hide();
        var get=location.search.substr(1).split("&");
        var page=1;
        $.each (get, function(key, paramString){
            var kAndValue=paramString.split("=");
            if (kAndValue[0]=="page"){
                page=kAndValue[1];
                return false;
            }
        });

        pj.getList(page);
        $("#projectListWrap").show();
        // 프로젝트 목록에서는 상단 검색배너 노출시킴_210316bySOON
        $(".projectHeadSearchWrap").show();
        //프로젝트 열람시 배경 회색으로
        $('.subWrap.content').css({'background-color':'#f0f0f0'})
    });


    $("#myProjectCheck").click(function(){
        if (SITE_URL_METHOD=='pc'){
            $(this).toggleClass("on");
        }else{
            $(this).toggleClass("on");
        }
        pj.getList();
    });

    $("#myLikeCheck").click(function(){
        if (SITE_URL_METHOD=='pc'){
            $(this).toggleClass("on");
        }else{
            $(this).toggleClass("on");
        }
        pj.getList();
    });

    $(".free-talkBtn").click(function(){
        $(window).scrollTop($("#projectViewFreetalkView").offset().top);
    });


    $(document).on('click','#replyFreetalkSubmitBtn',function(event){

        var parentNodeId = '#'+event.target.parentNode.id;//parent of "target"
        var txt=$(parentNodeId+' #replyFreetalkInput').val();
        var hide=0;
        if($(parentNodeId+" input[id='hide_comment']").prop("checked")){
         hide =1;
        }
        var parent_idx = $(parentNodeId).data('parent');
        if ($.trim(txt)=="") {alert('댓글을 입력하세요'); return false;}
        prs.aCall("/m4a/ftw",{
             hide:hide,
             parent:parent_idx,
             txt:txt,
             pno:pj.getPno()
         },function(r){
           $("#replyFreetalkContent_"+parent_idx).prepend(freeTalkParseNewReply(r.DATA));
            $(parentNodeId+' #replyFreetalkInput').val('');
            $(parentNodeId+' #hide_comment').attr("checked", false);
            $(parentNodeId+' .reply-secret').removeClass('active');
            $(parentNodeId+' .reply-secret img').attr('src', '/public/images/dgm/freetalk-secret-none.png');
            $(parentNodeId).css('display', 'none');
            $(parentNodeId).parent().parent().find('.reply_btn').removeClass('active');
           //replyFreetalkInput
         });
    });


    $(document).on('click','.replyFreetalkSubmitBtnNew',function(event){
        var parent_idx = $(this).attr('parent_id');
        var target_idx = $(this).attr('target_id');

        var txt= $('#cmtWriteTextArea_' + target_idx).val();
        var hide= $("#cmtWriteCheckbox_"+ $(this).attr('target_id')).hasClass("on")?'1':'0';
        
        if ($.trim(txt)=="") {alert('댓글을 입력하세요'); return false;}
        prs.aCall("/m4a/ftw",{
             hide:hide,
             parent:parent_idx,
             txt:txt,
             pno:pj.getPno()
         },function(r){
            var targetDiv = '#cmtWriteBox_'+parent_idx;
            $(targetDiv).after(freeTalkReplyParseNew(r.DATA));
            $('.cmtWrtieText[target_id="'+target_idx+'"]').click();
            $('#cmtWriteTextArea_' + target_idx).val('');
         });
    });

    $(document).on('click','#mreplyFreetalkSubmitBtn2',function(event){
        var parentNodeId = '#'+event.target.parentNode.id;//parent of "target"
        var txt=$(parentNodeId+' #replyFreetalkInput').val();
        var hide=0;
        if($(parentNodeId+" input[id='hide_comment']").prop("checked")){
            hide =1;
        }
        var parent_idx = $(parentNodeId).data('parent');
        if ($.trim(txt)=="") {alert('댓글을 입력하세요'); return false;}

        prs.aCall("/m4a/ftw",{
            hide:hide,
            parent:parent_idx,
            txt:txt,
            pno:pj.getPno()
        },function(r){
            $("#replyFreetalkContent_"+parent_idx).prepend(freeTalkParseNewReplyMoblie(r.DATA));
            $(parentNodeId+' #replyFreetalkInput').val('');
            $(parentNodeId+' #hide_comment').attr("checked", false);
            $(parentNodeId+' .reply-secret').removeClass('active');
            $(parentNodeId+' .reply-secret img').attr('src', '/public/img/mfreetalk-secret-none.png');
            $(parentNodeId).css('display', 'none');
            $(parentNodeId).parent().parent().find('.reply_btn').removeClass('active');
            //replyFreetalkInput
        });
    });

    $("#freetalkSubmitBtnNew").click(function(){
        var txt=$("#freetalkInputNew").val();
        var hide=0;
        if($("#projectHideCommentNew").hasClass("on")){
            hide =1;
        }
        if ($.trim(txt)=="") {alert('댓글을 입력하세요'); return false;}

        prs.aCall("/m4a/ftw",{
            hide:hide,
            txt:txt,
            pno:pj.getPno(),
            parent:0
        },function(r){

            $(".commentsWrapList").prepend(freeTalkParseNew(r.DATA));
            // $("#projectHideComment").attr("checked", false);
            $("#projectHideCommentNew").removeClass('on');
            // $("#projectHideComment").next('img').attr('src', '/public/images/dgm/freetalk-secret-none.png');
            $("#freetalkInputNew").val('').focus();
        });
    });

    $("#freetalkSubmitBtn").click(function(){
        var txt=$("#freetalkInput").val();
        var hide=0;
        if($("#projectHideComment").prop("checked")){
            hide =1;
        }

        if ($.trim(txt)=="") {alert('댓글을 입력하세요'); return false;}

        prs.aCall("/m4a/ftw",{
            hide:hide,
            txt:txt,
            pno:pj.getPno(),
            parent:0
        },function(r){
            if (SITE_URL_METHOD=='pc'){
                $("#projectViewFreetalkView").prepend(freeTalkParse(r.DATA));
                $("#projectHideComment").attr("checked", false);
                $("#projectHideComment").parent().parent().removeClass('active');
                $("#projectHideComment").next('img').attr('src', '/public/images/dgm/freetalk-secret-none.png');
            }
            else{
                $("#projectViewFreetalkView").prepend(freeTalkParseM(r.DATA));
                $("#projectHideComment").attr("checked", false);
                $("#projectHideComment").parent().parent().removeClass('active');
                $("#projectHideComment").next('img').attr('src', '/public/img/mfreetalk-secret-none.png');
            }
            $("#freetalkInput").val('').focus();
        });
    });

    $('#work_banner').on('click',function () {
        layerPopupOpen("#workBannerPopup");
    });
    $('#workBannerPopup .dim').on('click',function () {
        layerPopupClose("#workBannerPopup");
    });

    $(document).on('click', '.recruit-deadline, .apply-comple', function (e) {
        // e.preventDefault();
        $(this).find('.prjv-tooltip').fadeToggle();
    });
});

var getParameters = function (paramName) {
    // 리턴값을 위한 변수 선언
    var returnValue;

    // 현재 URL 가져오기
    var url = location.href;

    // get 파라미터 값을 가져올 수 있는 ? 를 기점으로 slice 한 후 split 으로 나눔
    var parameters = (url.slice(url.indexOf('?') + 1, url.length)).split('&');

    // 나누어진 값의 비교를 통해 paramName 으로 요청된 데이터의 값만 return
    for (var i = 0; i < parameters.length; i++) {
        var varName = parameters[i].split('=')[0];
        if (varName.toUpperCase() == paramName.toUpperCase()) {
            returnValue = parameters[i].split('=')[1];
            return decodeURIComponent(returnValue);
        }
    }
};


window.onpopstate=function(e){
    var data=e.state;
    var page=data.page;
    var pno=data.pno;

    if (page===undefined) page=1;

    $("#projectViewWrap, #login").hide();
    pj.getList(page);
    
    $("#projectListWrap").show();
    // 프로젝트 목록에서는 상단 검색배너 노출시킴_210316bySOON
    $(".projectHeadSearchWrap").show();
    //프로젝트 열람시 배경 회색으로
    $('.subWrap.content').css({'background-color':'#f0f0f0'})
    if (SITE_URL_METHOD=='mobile'){
        $("#container").show();
    }
};

$(window).load(function () {
    if (SITE_URL_METHOD=='mobile') {
        var startFreetalk = $('#projectViewFreetalkView').data('freetalk');
        if(startFreetalk) {
            $('html, body').animate({
                scrollTop: $('#projectViewFreetalkView').offset().top
            }, 500);
        }
    }
});

$(document).ready(function () {
    if (SITE_URL_METHOD=='mobile') {
        var mypageSort = new Swiper('#dgm-nav-container', {
            slidesPerView: 'auto'
        });

        $('.lastSwiper').on('click', function () {
            mypageSort.slideNext()
        });
        $('.firstSwiper').on('click', function () {
            //mypageSort.slidePrev()
        });
    }
});


/*모바일 프리톡 비밀글 체크*/
$(document).on('change', '.secert-chk', function () {
    if($(this).is(":checked")){
        $(this).next('img').attr('src', '/public/img/mfreetalk-secret.png');
        $(this).parent().parent().addClass('active');
    }else{
        $(this).next('img').attr('src', '/public/img/mfreetalk-secret-none.png');
        $(this).parent().parent().removeClass('active');
    }
});
$(document).on('click','.deselect-all',function(){
	
	$(".speciality").each(function(){
		$(this).find("li").removeClass("on");
	});
	$(".speciality ul").find("li").eq(0).addClass("on");
	
	$(".speciality-low").each(function(){
		$(this).find("input:checkbox").prop("checked",false);
		$(this).find("input:checkbox").removeClass("on");
	});
	
	$(".speciality-low").removeClass("on");

	$(".during").each(function(){
		$(this).find("li").removeClass("on");
	});
	$(".during ul").find("li").eq(0).addClass("on");
	
	$(".amount").each(function(){
		$(this).find("li").removeClass("on");
	});
	$(".amount ul").find("li").eq(0).addClass("on");
	
	$(".location").each(function(){
		$(this).find("input:checkbox").prop("checked",false);
		$(this).find("input:checkbox").removeClass("on");
	});
	
	
	$(".stayProject").each(function(){
		$(this).find("li").removeClass("on");
	});
	$(".stayProject ul").find("li").eq(0).addClass("on");
    pj.getList();
});

// 저장된 지원내용 불러오기 팝업_210608bySOON
$(document).on("click",".applyHistoryModalBtn",function(){
    var pno=$(this).data("pno");

    $('.applyHistoryWrap>div').remove();
    $('.historyOldMsg').hide();

    prs.aCall("/m4a/applyPreview",{
        pno:pno
    },function(r){

        var INFO=r.DATA.INFO;
        var data = r.DATA;

        var tag='';
        if(r.DATA.SHEETS.length){
            $.each(r.DATA.SHEETS,function(key, row){
                var renewalDate = new Date('2021-06-18');
                var updateDate = new Date(row.INS_TIME.substring(0,10));
                var titleTxt = htmlspecialchars(row.title);
                if(renewalDate > updateDate) { // 리뉴얼 날짜보다 이전에 저장된 지원내용이라면
                    var textReplace = htmlspecialchars(row.detail_txt).replace(/(<([^>]+)>)/ig,"").replace(/&lt;.+?&gt;/ig,'\n');
                    var oldMark = '<b class="old">이전</b>'
                    
                    if(titleTxt == ''){
                        var titleTxt = textReplace;
                    } else {
                        var titleTxt = htmlspecialchars(row.title);
                    }

                    $('.historyOldMsg').show();
                } else {
                    var textReplace = htmlspecialchars(row.detail_txt);
                    if(titleTxt == ''){
                        var titleTxt = textReplace;
                    } else {
                        var titleTxt = htmlspecialchars(row.title);
                    }
                    var oldMark = '';
                }
                
                
                tag+='<div class="historyRow">';
                tag+='    <p class="historyTxt" data-txt="'+textReplace+'">'+oldMark+titleTxt+'</p>';
                tag+='    <div class="historyInfo">';
                tag+='        <span class="historyDate">'+row.INS_TIME+'</span>';
                tag+='        <div class="historyDel" data-pno="'+pno+'" data-est="'+row.est_idx+'">⨉</div>';
                tag+='    </div>';
                tag+='</div>';
            });
        }else{
            tag+='<div class="historyEmpty">저장된 지원내용이 없습니다.</div>';
        }
        $('.applyHistoryWrap').html(tag);
    });
})
// 저장된 지원내용 불러오기
$(document).on("click",".applyHistoryWrap .historyTxt",function(){
    var thisTxt = $(this).attr('data-txt');
    $('#projectApplyText').val(thisTxt);
    $('.modalCloseHistory').trigger('click')
})
// 저장된 지원내용 불러오기_지원서 삭제
$(document).on("click",".applyHistoryWrap .historyDel",function(){
    var pno=$(this).data("pno");
    var est = $(this).data('est');

    $('.applyHistoryWrap>div').remove();
    $('.historyOldMsg').hide();

    prs.aCall("/m4a/applyPreview",{
        pno:pno,
        est:est,
    },function(r){

        var INFO=r.DATA.INFO;
        var data = r.DATA;

        var tag='';
        if(r.DATA.SHEETS.length){
            $.each(r.DATA.SHEETS,function(key, row){
                var renewalDate = new Date('2021-06-18');
                var updateDate = new Date(row.INS_TIME.substring(0,10));
                var titleTxt = htmlspecialchars(row.title);
                if(renewalDate > updateDate) { // 리뉴얼 날짜보다 이전에 저장된 지원내용이라면
                    var textReplace = htmlspecialchars(row.detail_txt).replace(/(<([^>]+)>)/ig,"").replace(/&lt;.+?&gt;/ig,'\n');
                    var oldMark = '<b class="old">이전</b>'
                    
                    if(titleTxt == ''){
                        var titleTxt = textReplace;
                    } else {
                        var titleTxt = htmlspecialchars(row.title);
                    }

                    $('.historyOldMsg').show();
                } else {
                    var textReplace = htmlspecialchars(row.detail_txt);
                    if(titleTxt == ''){
                        var titleTxt = textReplace;
                    } else {
                        var titleTxt = htmlspecialchars(row.title);
                    }
                    var oldMark = '';
                }
                
                
                tag+='<div class="historyRow">';
                tag+='    <p class="historyTxt" data-txt="'+textReplace+'">'+oldMark+titleTxt+'</p>';
                tag+='    <div class="historyInfo">';
                tag+='        <span class="historyDate">'+row.INS_TIME+'</span>';
                tag+='        <div class="historyDel" data-pno="'+pno+'" data-est="'+row.est_idx+'">⨉</div>';
                tag+='    </div>';
                tag+='</div>';
            });
        }else{
            tag+='<div class="historyEmpty">저장된 지원내용이 없습니다.</div>';
        }
        $('.applyHistoryWrap').html(tag);
    });
});

$(document).on('click','.applyHistorySave',function(){
    var saveInput = $('#applySaveCheckBox');
    if(saveInput.is(':checked')){
        saveInput.val(1)
    } else {
        saveInput.val(0)
    }
})
