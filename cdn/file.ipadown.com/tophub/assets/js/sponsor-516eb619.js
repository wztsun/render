(function ($) {
	// 动态插入弹窗的 HTML 结构
	const createPromoModal = () => {
		const modalHTML = `
			<div id="promoModal" style="position: fixed; right: 50px; bottom: 50px; width: 420px; padding: 30px 30px 20px; background-color: #ffe7e3; border: 1px solid #f3f3f3; box-shadow: 0 0 10px rgb(202 189 189 / 40%); display: none; z-index: 1000; font-size: 14px; border-radius: 20px;">
				<div class="close-btn" style="position: absolute; top: 15px; right: 15px; cursor: pointer; font-weight: bold;">×</div>
				<h3>【赞助商推荐】🔥 UP简历 - 免费在线AI简历制作工具 ✨</h3>
				<p>告别简历写作痛点！UP简历基于先进 AI 技术，旨在让求职者在10分钟内高效生成专业且脱颖而出的个人简历：</p>
				<p>• 对职场新人：轻松构建首份简历，突出优势专业亮点。</p>
				<p>• 对资深人士：提炼多年经验，精准匹配职位需求，提升面试率。</p>
				<p>• 对求职更换赛道者：AI 建议助你快速转型，讲好“为什么适合”引发面试邀约。</p>
				<p>🚀 简历起飞，就用 UP 简历！ <a style="font-weight:bold;color:#FF5722;	text-decoration:underline;" href="https://upcv.tech/?invite=INVFDVGJC1P" target="_blank">开启你的职业新篇章！</a></p>
			</div>
		`;
		// 将弹窗插入到 body 的末尾
		$('body').append(modalHTML);
	};

	// 初始化弹窗逻辑
	const initPromoModal = () => {
		// 检查是否存在 "promo_closed" cookie
		if (!Cookies.get('promo_closed')) {
			// 如果 cookie 不存在，显示弹窗
			$('#promoModal').fadeIn();
		}

		// 绑定关闭按钮事件
		$('#promoModal .close-btn').click(function () {
			$('#promoModal').fadeOut();
			// 设置 cookie，有效期为 7 天
			Cookies.set('promo_closed', 'true', { expires: 30 });
		});
	};

	// 文档加载完成后执行
	$(document).ready(function () {
		createPromoModal(); // 创建弹窗
		initPromoModal(); // 初始化弹窗逻辑
	});

})(jQuery);