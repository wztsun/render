// 登录重定向函数
function redirectToLogin() {
	// 获取当前页面的完整URL
	var currentUrl = window.location.href;
	
	// 将当前页面URL进行编码，作为redirect参数
	var redirectParam = encodeURIComponent(currentUrl);
	
	// 跳转到登录页面，并带上redirect参数
	window.location.href = '/login?redirect=' + redirectParam;
}
// 退出确认函数
function confirmLogout() {
	if(confirm('确定要退出登录吗？')) {
		window.location.href = '/logout';
	}
}

$(document).ready(function() {
	
	// 更多菜单的悬停和点击功能
	let hoverTimeout;
	
	$('#more-button').hover(
		function() {
			clearTimeout(hoverTimeout);
			$('#more-dropdown').show();
		},
		function() {
			hoverTimeout = setTimeout(function() {
				$('#more-dropdown').hide();
			}, 300);
		}
	);
	
	$('#more-dropdown').hover(
		function() {
			clearTimeout(hoverTimeout);
		},
		function() {
			hoverTimeout = setTimeout(function() {
				$('#more-dropdown').hide();
			}, 300);
		}
	);
	
	$('body').on('click', '#more-button', function(e) {
		e.preventDefault();
		$('#more-dropdown').toggle();
	});
	
	$(document).on('click', function(e) {
		if ($(e.target).closest('#more-button').length === 0) {
			$('#more-dropdown').hide();
		}
	});
	
	$('body').on('click', "#products-button", function (e){
		$(".H-B").show();
		$(".item-list").hide();
		e.stopPropagation();
		$('body').one("click",function(){
			$(".H-B").hide();
		});
	});
	
    $('body').on('click', "#accounts-button", function (e){
		$(".item-list").show();
		$(".H-B").hide();
		e.stopPropagation();
		$('body').one("click",function(){
			$(".item-list").hide();
		});
	});
		
	$('body').on('click', '.action-share', function (){
		layer.open({
		  type: 1,
		  anim: 2,
		  title: false,
		  area: ['500px', '360px'],
		  scrollbar: false,
		  shadeClose: true,
		  content: share_template,
		});
		var attr_url = $(this).attr('url');
		var attr_title = $(this).attr('title');
		var attr_description = $(this).attr('description');
		var attr_logo = $(this).attr('logo');
		var share = new SShare({
			url: ((typeof attr_url !== typeof undefined && attr_url !== false) ? attr_url : window.location.href),
			title: ((typeof attr_title !== typeof undefined && attr_title !== false) ? attr_title : document.title),
			description: ((typeof attr_description !== typeof undefined && attr_description !== false) ? attr_description : document.querySelector('meta[name=description]').getAttribute('content')),
			image: ((typeof attr_logo !== typeof undefined && attr_logo !== false) ? attr_logo : "https://file.ipadown.com/remai/assets/images/logo.png"),
		});
	});
    	
    $('body').on('click', ".darkmode", function (e){
		$(".darkmode .switch").toggleClass("on");
		if(Cookies.get('darkmode')){
			Cookies.remove('darkmode');
		}
		else{
			Cookies.set('darkmode', 'on', { expires: 365 });
		}
		$('body').toggleClass("dark");
		e.stopPropagation();
	});
	
	if($(".nano").length>0){
		$(".nano").nanoScroller();
	}
	
	$('body').on('click', '.Ib-T', function (){
		var nodeid = $(this).attr("nodeid");
		var is_follow = $(this).attr("is_follow");
		var $this = $(this);
		$.post(("/node/"+(is_follow==1?"unfollow":"follow")), { nodeid : nodeid },function(data){
			if(!data.error){
				$this.attr("is_follow",(is_follow==1?"0":"1"));
				$this.removeClass("Ib-T-"+(is_follow==1?"xc":"yc")).addClass("Ib-T-"+(is_follow==1?"yc":"xc"));
				
				if($this.hasClass("popover")){
					$this.text(is_follow==1?"订阅":"取消订阅");
				}
				$("#node-"+nodeid).find(".i-o").attr("is_follow",(is_follow==1?"0":"1"));
				if(is_follow==1 && $(document).find(".bc-tc-tb").text()=='我的订阅'){
					$('.i-o').webuiPopover('destroy');
					$("#node-"+nodeid).fadeOut('normal',function(){
						$("#node-"+nodeid).remove();
					});
				}
				
			}
			else{
				if (data.msg.includes('会员') && typeof VipPopover !== 'undefined' && VipPopover.showVipLayer) {
					VipPopover.showVipLayer('需要开通会员');
				} else {
					layer.msg(data.msg);
				}
			}
		});
	
	});
	
	// 批量订阅链接点击事件
	$('body').on('click', '.batch-follow-link a', function (e){
		e.preventDefault(); // 阻止链接默认行为
		
		// 确认对话框
		layer.confirm('确定要批量订阅当前页所有节点吗？', {
			btn: ['确定','取消'],
			title: '批量订阅'
		}, function() {
			// 用户点击确定，开始收集节点ID			
			var nodeIds = [];
			$("[nodeid]").each(function() {
				var nodeId = $(this).attr("nodeid");
				if (nodeId && $.isNumeric(nodeId)) {
					nodeIds.push(nodeId);
				}
			});
			
			// 去重
			nodeIds = nodeIds.filter(function(item, pos) {
				return nodeIds.indexOf(item) === pos;
			});
			
			if (nodeIds.length === 0) {
				layer.msg('未找到可订阅的节点', {icon: 2});
				return;
			}
			
			// 显示加载中
			var loadingIndex = layer.load(1, {
				shade: [0.1, '#fff']
			});
			
			// 发送批量订阅请求
			$.ajax({
				url: '/node/follow',
				type: 'POST',
				dataType: 'json',
				data: {
					nodeids: nodeIds.join(',')
				},
				success: function(res) {
					layer.close(loadingIndex);
					
					if (!res.error) {
						layer.msg(res.msg || '批量订阅成功', {icon: 1});
						
						// 更新页面上的订阅状态
						nodeIds.forEach(function(nodeId) {
							
							var $node = $("#node-" + nodeId);
							
							if ($node.length) {
								var $followBtn = $node.find(".Ib-T");
								
								if ($followBtn.length && $followBtn.attr("is_follow") !== "1") {
									$followBtn.attr("is_follow", "1");
									$followBtn.removeClass("Ib-T-yc").addClass("Ib-T-xc");
							
									// 更新订阅状态文本
									var $infoText = $node.find(".i-h");
									if ($infoText.length && !$infoText.text().includes("已订阅")) {
										$infoText.text($infoText.text() + " · 已订阅");
									}
								}
							}
						});
					} else {
						layer.msg(res.msg || '批量订阅失败', {icon: 2});
					}
				},
				error: function() {
					layer.close(loadingIndex);
					layer.msg('网络错误，请稍后重试', {icon: 2});
				}
			});
		});
	});
	
	$('body').on('click', "a[itemid]", function (e){
		var itemid = $(this).attr("itemid");
		$.post("/item-view", { itemid : itemid },function(data){});
	});
	
	$('body').on('click', ".i-o", function (e){
		e.stopPropagation();
		$(this).webuiPopover('destroy').webuiPopover({
							trigger:'click',
							title:'操作',
							content:'<span class="node-actions">'+
								'<a class="Ib-T popover" nodeid="'+$(this).attr("nodeid")+'" is_follow="'+$(this).attr("is_follow")+'">'+($(this).attr("is_follow")==1?'取消':'')+'订阅</a>'+
								'<a class="copy" nodeid="'+$(this).attr("nodeid")+'" hashid="'+$(this).attr("hashid")+'">复制内容</a>'+
								'<a href="/n/'+$(this).attr("hashid")+'">访问节点</a>'+
							'</span>',
							width:'auto',						
							multi:false,						
							closeable:true,
							style:(Cookies.get('darkmode')?'inverse':''),
							padding:true,
							backdrop:false,
							//dismissible:true,
							cache:false,
							animation:'pop'
					}).webuiPopover('show');

	});
	
	



	$('body').on('click', ".alert-button", function (e){
		var alertid = parseInt($(this).attr("alertid"));
		var is_follow = parseInt($(this).attr("is_follow"));
		var $this = $(this);
		
		$.post(("/alert/"+(is_follow==1?"delete":"create")), { alertid : alertid },function(data){
			if(!data.error){
				$this.attr("is_follow",(is_follow==1?"0":"1"));
				
				if ($this.text().trim().includes("订阅")) {
					// 按钮原本是文字，使用 text 切换
					$this.text(is_follow == 1 ? "订阅" : "取消订阅");
				} else {
					// 按钮原本是图标编码，使用 html 切换
					$this.html(is_follow == 1 ? "&#xe6cd;" : "&#xe63f;");
				}
							
				layer.msg(is_follow==1?"已为你取消追踪":"已为你添加追踪");
			}
			else{
				layer.msg(data.msg);
			}
		});		

	});
	
	
	$('body').on('click', '.copy', function (){
		var nodeid = $(this).attr("nodeid");
		var hashid = $(this).attr("hashid");
		
		//私人聚合
		if(nodeid == 261 || nodeid == 279 || nodeid == 280){
			layer.msg("私人订阅内容暂不支持复制分享");
			return ;
		}
		
		var date = new Date();
        var curYear = date.getFullYear();
        var curMonth = date.getMonth() + 1;
        var curDate = date.getDate();
        if(curMonth<10){
                curMonth = '0' + curMonth;
        }
        if(curDate<10){
                curDate = '0' + curDate;
        }    
        var curHours = date.getHours();
        
        var name = $('#node-' + nodeid + ' .cc-cd-lb').text().replace(/(^\s*)|(\s*$)/g, "");
		var linestr = "▌" + (name=="实时榜中榜"?"「今日热榜」":name) + $('#node-' + nodeid + ' .cc-cd-sb-ss-ia .cc-cd-sb-st').text() + " (" + curYear + "年" + curMonth + "月" + curDate + "日" + curHours + "时)\n";
		
		if(nodeid == 277){
			$('#node-' + nodeid + ' .mp').each(function(i,n){
				linestr += $(n).find(".pp").text();
				linestr += "、";
				linestr += $(n).find(".tt").text();
				linestr += (" (" + $(n).find(".ss").text() + ")");
				linestr += "\n";
			});
		}
		else{
			$('#node-' + nodeid + ' .cc-cd-cb-ll').each(function(i,n){
				linestr += $(n).find(".s").text();
				linestr += "、";
				linestr += $(n).find(".t").text();
				if($(n).find(".e").text().length >0) linestr += (" (" + $(n).find(".e").text() + ")");
				linestr += "\n";
			});
		}
		
		linestr += "#今日热榜 https://tophub.today/n/" + hashid;
		
		layer.open({
		  type: 1,
		  anim: 2,
		  title: "复制",
		  area: ['500px', '330px'],
		  scrollbar: false,
		  shadeClose: true,
		  content: '<div class="copy-box"><textarea class="form-control" rows="10" id="copy-content">'+linestr+'</textarea><p><button class="form-btn" type="button" data-clipboard-target="#copy-content">点击复制内容</button></p></div>'
		});
	});


	if(window.ClipboardJS) {

		var clipboard = new ClipboardJS('.form-btn');
		clipboard.on('success', function(e) {
			$('.form-btn').text("复制成功");
		    e.clearSelection();
		});
		clipboard.on('error', function(e) {
			$('.form-btn').text("复制失败,请手工操作");
		});	
	
	}
	
	
	// 查找所有带有data-sponsors-status属性的元素
	$('[data-sponsors-status="1"]').each(function() {
		var $this = $(this);
		var key = $this.data('key');
		var limit = $this.data('limit');

		// 发送POST请求获取广告列表
		$.ajax({
			url: '/sponsors',
			type: 'POST',
			data: {
				key: key,
				limit: limit
			},
			dataType: 'json',
			success: function(response) {
				// 如果有广告数据
				if (response && response.data && response.data.length > 0) {
					// 遍历广告数据并渲染
					var adHtml = '';
					$.each(response.data, function(index, ad) {
						adHtml += '<div class="m-b-md"><a href="' + ad.url + '" target="_blank"><img src="' + ad.thumbnail + '" alt="' + ad.title + '"></a></div>';
					});
					// 将广告添加到容器的开头
					$this.prepend(adHtml);
				}
			},
			error: function(xhr, status, error) {
				console.error('加载广告失败:', error);
			}
		});
	});
	
});

var allowedDomains = ["8080-agq5rnz5hitjeklmq4mhpxmkzm.instabox.tech", "tophub.today", "tophub.app", "tophub.xyz"];
var currentDomain = window.location.hostname;
if (!allowedDomains.includes(currentDomain)) {
  void 0; /* redirect disabled */
}


// (() => {
// 
// 	function block() {
// 		setInterval(() => {
// 			debugger;
// 		}, 1000);
// 	}
// 
// 	try {
// 		block();
// 	} catch (err) {
// 		console.error("Block function failed:", err);
// 	}
// })();




/**
 * 导航链接高亮处理脚本
 * 功能：
 * 1. 检查当前页面的 URL 与顶部导航链接是否匹配，并为匹配的链接添加 F-gb-jb 类
 * 2. 检查当前页面的 URL 与侧边栏导航链接是否匹配，并为匹配的链接添加 active 类和箭头图标
 */
$(document).ready(function() {
	// 获取当前页面的 URL 路径
	var currentPath = window.location.pathname;
	
	// 处理顶部导航链接
	$('.F-gb').each(function() {
		var linkHref = $(this).attr('href');
		
		// 跳过 javascript:void(0) 链接
		if (linkHref === 'javascript:void(0)') {
			return true; // 相当于 continue
		}
		
		// 检查当前 URL 是否与链接匹配
		if (linkHref === '/' && currentPath === '/') {
			// 首页特殊处理
			$(this).addClass('F-gb-jb');
		} else if (linkHref !== '/' && currentPath.startsWith(linkHref)) {
			// 移除所有导航项的 F-gb-jb 类
			$('.F-gb').removeClass('F-gb-jb');
			// 为当前匹配的导航项添加 F-gb-jb 类
			$(this).addClass('F-gb-jb');
		}
	});
	
	// 处理侧边栏导航链接
	let matched = null;
	$('.cb.sd ul li a').each(function () {
		if ($(this).data('skip-match')) return; // 跳过
		const href = $(this).attr('href').split(/[?#]/)[0];
		if (currentPath === href || currentPath.startsWith(href + '/')) {
			if (!matched || href.length > matched.attr('href').length) {
				matched = $(this);
			}
		}
	});
	//$('.cb.sd ul li a').removeClass('active').find('i.m-n').remove();
	if (matched) {
		matched.addClass('active').append('<i class="m-n">&#xe652;</i>');
		// // 添加箭头图标，如果还没有的话
		// if ($(this).find('i.m-n').length === 0) {
		// 	$(this).append('<i class="m-n">&#xe652;</i>');
		// }
	}

});
